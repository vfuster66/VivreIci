import Image from "next/image"
import Link from "next/link"

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F5F5F5]">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(250,196,17,0.2),_transparent_62%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 pt-10 pb-16 text-center">
        <div className="flex flex-col items-center">
          <Image
            src="/logos/7.svg"
            alt="VivreIci"
            width={320}
            height={320}
            className="h-auto w-[250px] sm:w-[320px]"
            priority
          />
          <p className="mt-5 max-w-[20rem] text-[17px] leading-7 text-[#666666]">
            L’application pour signaler et suivre ce qui se passe près de chez vous.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/inscription"
            className="flex h-14 w-[250px] items-center justify-center rounded-full bg-[#fac411] px-8 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(250,196,17,0.24)] transition hover:bg-[#E0AF00] sm:w-[320px]"
          >
            Inscription
          </Link>
          <Link
            href="/connexion"
            className="flex h-14 w-[250px] items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-[#1A1A1A] ring-1 ring-gray-200 transition hover:bg-[#FAFAFA] sm:w-[320px]"
          >
            Connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
