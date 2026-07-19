export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 640 }}>
      <h1>Choideyy Contact Service</h1>
      <p>
        This service exposes <code>POST /api/contact</code> for the Choideyy Contact Us form.
      </p>
      <p>
        Interactive docs: <a href="/api/docs">/api/docs</a> · OpenAPI:{" "}
        <a href="/api/openapi.json">/api/openapi.json</a>
      </p>
      <p>See the repository README for setup, environment variables, and usage examples.</p>
    </main>
  );
}
