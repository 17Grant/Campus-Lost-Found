import ReportForm from './ReportForm';

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return <ReportForm initialType={type === 'found' ? 'FOUND' : 'LOST'} />;
}