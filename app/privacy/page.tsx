import Link from "next/link";

export const metadata = {
  title: "Privacy | Canopy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase text-primary">Canopy</p>
      <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight md:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Effective August 11, 2026
      </p>
      <div className="mt-8 space-y-8 text-sm leading-7">
        <section>
          <h2 className="font-serif text-xl font-semibold">What we collect</h2>
          <p className="mt-2">
            Canopy stores the account details needed to provide your sign-in,
            including your name, email address, and authentication session
            information. It also stores the vocabulary you add, personal card
            changes, review scheduling state, saved example context, and
            completed practice sessions.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">How we use it</h2>
          <p className="mt-2">
            We use this information to run your private learning workspace:
            authenticate you, keep your cards and history available, schedule
            reviews, and generate requested learning content. Your cards and
            saved practice are scoped to your account.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">
            Service providers
          </h2>
          <p className="mt-2">
            Canopy relies on infrastructure providers to host the application
            and database. When you ask Canopy to generate AI content, the
            selected vocabulary and the text needed for that request are sent to
            OpenAI to produce the response. Do not include sensitive personal
            information in vocabulary imports or practice prompts.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">
            Retention and control
          </h2>
          <p className="mt-2">
            You can edit, archive, or delete individual cards and delete saved
            practice from within Canopy. To request account deletion or ask a
            privacy question, contact us through the{" "}
            <Link
              className="text-primary underline"
              href="https://github.com/meleongg/Canopy"
            >
              Canopy GitHub repository
            </Link>
            . We may keep limited information where necessary to meet legal,
            security, or operational obligations.
          </p>
        </section>
        <section>
          <h2 className="font-serif text-xl font-semibold">Changes</h2>
          <p className="mt-2">
            We may update this policy as Canopy changes. We will post the
            updated version here and revise its effective date.
          </p>
        </section>
      </div>
    </main>
  );
}
