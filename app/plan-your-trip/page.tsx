import Link from "next/link";

export const metadata = {
  title: "Plan Your Trip · Kane Pubs",
  description:
    "Shape an itinerary with intention—seasons, tables, stays, and the moments between.",
};

export default function PlanYourTripPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "clamp(1.5rem, 4vw, 3rem)",
        maxWidth: "920px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <p style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/"
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold-dim)",
          }}
        >
          ← Home
        </Link>
      </p>

      <header style={{ marginBottom: "2.5rem" }}>
        <p
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#6e0f1f",
            marginBottom: "0.75rem",
          }}
        >
          Travel
        </p>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 600,
            color: "var(--gold-bright)",
            lineHeight: 1.15,
            marginBottom: "1rem",
          }}
        >
          Plan Your Trip
        </h1>
        <p
          style={{
            color: "var(--gold-dim)",
            lineHeight: 1.75,
            fontSize: "1.05rem",
            maxWidth: "42rem",
          }}
        >
          A journey worth taking begins before you pack. Start with the pace you want, the
          flavors you crave, and the light you hope to see at the window—then let the map
          follow your curiosity, not the other way around.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <section
          className="glass-panel"
          style={{
            padding: "1.5rem 1.25rem",
            borderColor: "rgba(110, 15, 31, 0.45)",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <h2
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#6e0f1f",
              marginBottom: "0.75rem",
            }}
          >
            Pace &amp; season
          </h2>
          <p style={{ color: "var(--gold-dim)", lineHeight: 1.75, fontSize: "0.95rem" }}>
            Decide whether this escape is a slow exhale or a bright sprint. Match your window to
            weather you love—mist and hearths, sun on stone terraces, or the electric hum of a city
            after dark. When the season fits your temperament, every meal and detour feels
            inevitable in the best way.
          </p>
        </section>

        <section
          className="glass-panel"
          style={{
            padding: "1.5rem 1.25rem",
            borderColor: "rgba(110, 15, 31, 0.45)",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <h2
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#6e0f1f",
              marginBottom: "0.75rem",
            }}
          >
            Tables &amp; stays
          </h2>
          <p style={{ color: "var(--gold-dim)", lineHeight: 1.75, fontSize: "0.95rem" }}>
            Anchor each day around one reservation or ritual worth savoring—a chef’s tasting,
            a neighborhood trattoria, a rooftop at blue hour. Choose stays that reward you when
            you return tired and happy: crisp linen, a worthy shower, silence when you need it.
            The right room turns a trip from a checklist into a story you tell for years.
          </p>
        </section>

        <section
          className="glass-panel"
          style={{
            padding: "1.5rem 1.25rem",
            borderColor: "rgba(201, 162, 39, 0.35)",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <h2
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--gold-bright)",
              marginBottom: "0.75rem",
            }}
          >
            Next step
          </h2>
          <p style={{ color: "var(--gold-dim)", lineHeight: 1.75, fontSize: "0.95rem" }}>
            We’re building concierge-style tools and curated picks to turn this outline into a
            full itinerary—routes, pacing, and the little doors only locals know. For now, use
            this page as your compass; the rest of the magazine will meet you here as we ship
            new guides and services.
          </p>
        </section>
      </div>
    </div>
  );
}
