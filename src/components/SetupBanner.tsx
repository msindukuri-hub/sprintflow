export default function SetupBanner() {
  return (
    <div className="setup-banner">
      <strong>Preview mode:</strong> the database is not connected yet, so data is kept in memory
      only and will be lost on refresh. Once the PostgreSQL database is connected, your data will
      be stored for real.
    </div>
  );
}