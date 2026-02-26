export default function HomePage() {
  return (
    <main
      style={{
        padding: "2rem 1.5rem",
        textAlign: "center",
        maxWidth: "900px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <h1 style={{ marginBottom: "0.5rem", color: "var(--gold-bright)" }}>
        Kane Pubs
      </h1>
      <p style={{ color: "var(--gold-dim)", marginBottom: "2rem" }}>
        Contacts · Organizations · Business
      </p>
      <p style={{ color: "var(--gold-dim)", lineHeight: 1.7 }}>
        Use the menu on the left to add a new contact, organization, or business. Content for this area will be added next.
      </p>
    </main>
  );
}
