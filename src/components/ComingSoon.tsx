export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div>
      <h1 className="mb-2 text-lg font-semibold">{title}</h1>
      <p className="text-sm text-gray-500">{phase}</p>
    </div>
  );
}
