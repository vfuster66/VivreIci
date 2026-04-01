"use client"

import type { SupabaseClient } from "@supabase/supabase-js"
import { appendOfflineReportLog } from "./offline-report-logs"
import {
  isLikelyNetworkError,
  submitReportPayload,
  type ReportMediaInput,
  type ReportSubmissionPayload,
} from "./report-submission"
import type { ReportCoordinates } from "./report-location"

const OFFLINE_REPORTS_DB = "vivreici-offline-reports"
const OFFLINE_REPORTS_STORE = "reports"
const OFFLINE_REPORTS_EVENT = "offline-reports:changed"
const REPORTS_SYNC_EVENT = "reports:sync"
const SENT_RETENTION_MS = 24 * 60 * 60 * 1000

export type OfflineReportStatus = "pending" | "syncing" | "sent" | "error"

export type OfflineQueuedReport = {
  localId: string
  type: string
  description: string
  address: string
  selectedCoordinates: ReportCoordinates | null
  mediaFiles: ReportMediaInput[]
  createdAt: string
  updatedAt: string
  status: OfflineReportStatus
  lastError: string | null
  retryCount: number
  syncedAt: string | null
  remoteReportId: string | null
}

type OfflineQueuedReportInput = Omit<
  OfflineQueuedReport,
  "localId" | "createdAt" | "updatedAt" | "status" | "lastError" | "retryCount" | "syncedAt" | "remoteReportId"
>

let syncPromise: Promise<void> | null = null

function isIndexedDbAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window
}

function dispatchOfflineReportsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OFFLINE_REPORTS_EVENT))
  }
}

function dispatchReportsSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REPORTS_SYNC_EVENT))
  }
}

function formatOfflineSyncError(error: unknown) {
  if (isLikelyNetworkError(error)) {
    return "Connexion interrompue. Nouvelle tentative automatique dès que possible."
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === "object" && error !== null) {
    const message = [error, "message" in error ? error.message : null]
      .flatMap((value) => (typeof value === "string" ? [value] : []))
      .find(Boolean)

    if (message) {
      return message
    }
  }

  return "L'envoi a échoué. Nouvelle tentative automatique en attente."
}

async function openOfflineReportsDb() {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB n'est pas disponible sur cet appareil.")
  }

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(OFFLINE_REPORTS_DB, 1)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(OFFLINE_REPORTS_STORE)) {
        database.createObjectStore(OFFLINE_REPORTS_STORE, {
          keyPath: "localId",
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withOfflineReportsStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
) {
  const database = await openOfflineReportsDb()

  return await new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(OFFLINE_REPORTS_STORE, mode)
    const store = transaction.objectStore(OFFLINE_REPORTS_STORE)
    let settled = false
    let callbackResult: T | undefined

    transaction.oncomplete = () => {
      database.close()
      if (!settled) {
        settled = true
        resolve(callbackResult as T)
      }
    }

    transaction.onerror = () => {
      database.close()
      if (!settled) {
        settled = true
        reject(transaction.error)
      }
    }

    transaction.onabort = () => {
      database.close()
      if (!settled) {
        settled = true
        reject(transaction.error)
      }
    }

    Promise.resolve(callback(store))
      .then((result) => {
        callbackResult = result
      })
      .catch((error) => {
        if (!settled) {
          settled = true
          transaction.abort()
          database.close()
          reject(error)
        }
      })
  })
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function putOfflineReport(report: OfflineQueuedReport) {
  await withOfflineReportsStore("readwrite", async (store) => {
    await requestToPromise(store.put(report))
  })
  dispatchOfflineReportsChanged()
}

async function deleteOfflineReport(localId: string) {
  await withOfflineReportsStore("readwrite", async (store) => {
    await requestToPromise(store.delete(localId))
  })
}

export async function listOfflineReports() {
  const reports = await withOfflineReportsStore("readonly", async (store) => {
    return await requestToPromise(
      store.getAll()
    ) as OfflineQueuedReport[]
  })

  return reports.sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
  )
}

export async function enqueueOfflineReport(input: OfflineQueuedReportInput) {
  const now = new Date().toISOString()
  const report: OfflineQueuedReport = {
    localId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `offline-${Date.now()}`,
    type: input.type,
    description: input.description,
    address: input.address,
    selectedCoordinates: input.selectedCoordinates,
    mediaFiles: input.mediaFiles,
    createdAt: now,
    updatedAt: now,
    status: "pending",
    lastError: null,
    retryCount: 0,
    syncedAt: null,
    remoteReportId: null,
  }

  await putOfflineReport(report)
  appendOfflineReportLog({
    localId: report.localId,
    message: "Signalement mis en file locale.",
  })
  return report
}

export function subscribeToOfflineReports(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  window.addEventListener(OFFLINE_REPORTS_EVENT, callback)
  return () => window.removeEventListener(OFFLINE_REPORTS_EVENT, callback)
}

async function cleanupOfflineReports() {
  const reports = await listOfflineReports()

  await Promise.all(
    reports
      .filter(
        (report) =>
          report.status === "sent" &&
          report.syncedAt &&
          Date.now() - new Date(report.syncedAt).getTime() > SENT_RETENTION_MS
      )
      .map((report) => deleteOfflineReport(report.localId))
  )

  dispatchOfflineReportsChanged()
}

async function updateOfflineReport(
  localId: string,
  updater: (current: OfflineQueuedReport) => OfflineQueuedReport
) {
  const reports = await listOfflineReports()
  const current = reports.find((report) => report.localId === localId)

  if (!current) {
    return
  }

  await putOfflineReport(updater(current))
}

async function syncOfflineReportsInternal(
  supabase: SupabaseClient,
  targetLocalIds?: string[]
) {
  if (syncPromise) {
    return await syncPromise
  }

  syncPromise = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      appendOfflineReportLog({
        level: "error",
        message: "Sync ignorée : appareil toujours hors ligne.",
      })
      return
    }

    await cleanupOfflineReports()

    const reports = await listOfflineReports()
    const scopedReports = targetLocalIds?.length
      ? reports.filter((report) => targetLocalIds.includes(report.localId))
      : reports

    for (const report of scopedReports) {
      if (report.status === "sent" || report.status === "syncing") {
        continue
      }

      appendOfflineReportLog({
        localId: report.localId,
        message: "Tentative de synchronisation lancée.",
      })
      await updateOfflineReport(report.localId, (current) => ({
        ...current,
        status: "syncing",
        lastError: null,
        updatedAt: new Date().toISOString(),
      }))

      try {
        const result = await submitReportPayload({
          supabase,
          payload: {
            type: report.type,
            description: report.description,
            address: report.address,
            selectedCoordinates: report.selectedCoordinates,
            mediaFiles: report.mediaFiles,
          } satisfies ReportSubmissionPayload,
          onLog: (message) =>
            appendOfflineReportLog({
              localId: report.localId,
              message,
            }),
        })

        await updateOfflineReport(report.localId, (current) => ({
          ...current,
          status: "sent",
          updatedAt: new Date().toISOString(),
          syncedAt: new Date().toISOString(),
          remoteReportId: result.reportId,
          lastError: null,
        }))
        appendOfflineReportLog({
          localId: report.localId,
          message: `Synchronisation réussie. Report distant : ${result.reportId}`,
        })
        dispatchReportsSync()
      } catch (error) {
        const formattedError = formatOfflineSyncError(error)
        await updateOfflineReport(report.localId, (current) => ({
          ...current,
          status: "error",
          updatedAt: new Date().toISOString(),
          retryCount: current.retryCount + 1,
          lastError: formattedError,
        }))
        appendOfflineReportLog({
          localId: report.localId,
          level: "error",
          message: `Échec de synchronisation : ${formattedError}`,
        })
      }
    }
  })()

  try {
    await syncPromise
  } finally {
    syncPromise = null
    dispatchOfflineReportsChanged()
  }
}

export async function syncOfflineReports(supabase: SupabaseClient) {
  return await syncOfflineReportsInternal(supabase)
}

export async function retryOfflineReport(
  supabase: SupabaseClient,
  localId: string
) {
  return await syncOfflineReportsInternal(supabase, [localId])
}
