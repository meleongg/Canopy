import Link from "next/link";

export const metadata = {
  title: "Terms | Canopy",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase text-primary">Canopy</p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight md:text-4xl">
        Terms of Use
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Effective August 11, 2026
      </p>
      <div className="mt-8 space-y-8 text-sm leading-7">
        <section>
          <h2 className="font-serif text-xl font-semibold">Using Canopy</h2>
          <p className="mt-2">
            Canopy is a private-beta vocabulary learning workspace. Use it for
            lawful personal learning, keep your account credentials secure, and
            provide accurate registration information. You are responsible for
            the vocabulary and prompts you add.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">
            Generated content
          </h2>
          <p className="mt-2">
            Stories, example context, and chat responses are generated to
            support language practice. They can be incomplete or inaccurate and
            should not be treated as professional advice or as a substitute for
            a trusted dictionary, teacher, or other specialist.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">Respectful use</h2>
          <p className="mt-2">
            Do not attempt to access another person&apos;s account or data,
            interfere with the service, probe its security, or use Canopy in a
            way that violates applicable law or another person&apos;s rights. We
            may suspend access to protect learners and the service.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">Availability</h2>
          <p className="mt-2">
            Canopy is provided as a private beta and may change, pause, or end
            as it develops. We do not guarantee uninterrupted availability or
            that generated content will always meet a particular purpose.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">
            Questions and changes
          </h2>
          <p className="mt-2">
            Questions about these terms can be sent through the{" "}
            <Link
              className="text-primary underline"
              href="https://github.com/meleongg/Canopy"
            >
              Canopy GitHub repository
            </Link>
            . We may revise these terms as Canopy changes; the current version
            and effective date will always appear on this page.
          </p>
        </section>
      </div>
    </main>
  );
}
