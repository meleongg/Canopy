import Link from "next/link";

export const metadata = {
  title: "Attributions | Canopy",
};

export default function AttributionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase text-primary">Canopy</p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight md:text-4xl">
        Attributions
      </h1>
      <div className="mt-8 space-y-8 text-sm leading-7">
        <section>
          <h2 className="font-serif text-xl font-semibold">CC-CEDICT</h2>
          <p className="mt-2">
            Chinese dictionary definitions in Canopy are derived from CC-CEDICT
            contributors and are normalized for lookup in Canopy. The source
            data is available from the{" "}
            <Link
              className="text-primary underline"
              href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict"
            >
              CC-CEDICT download page
            </Link>{" "}
            and is licensed under{" "}
            <Link
              className="text-primary underline"
              href="https://creativecommons.org/licenses/by-sa/4.0/"
            >
              Creative Commons Attribution-ShareAlike 4.0 International
            </Link>
            . The release used by Canopy is recorded with the lookup data.
          </p>
        </section>
      </div>
    </main>
  );
}
