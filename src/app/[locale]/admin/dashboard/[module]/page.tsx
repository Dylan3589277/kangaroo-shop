import DashboardClientWrapper from '../components/DashboardClientWrapper';
import { ModuleDetailPage } from '../components/ModuleDetailPage';

// Map URL-friendly slugs to internal module IDs
// e.g. /admin/dashboard/supply-chain → moduleId: 'supply_chain'
function normalizeModuleId(slug: string): string {
  return slug === 'supply-chain' ? 'supply_chain' : slug;
}

export default function DashboardModulePage({
  params,
  searchParams,
}: {
  params: { module: string };
  searchParams?: { start?: string; end?: string };
}) {
  const moduleId = normalizeModuleId(params.module);
  const initialDateRange = searchParams?.start && searchParams?.end
    ? { start: searchParams.start, end: searchParams.end }
    : undefined;

  return (
    <DashboardClientWrapper>
      <ModuleDetailPage moduleId={moduleId} initialDateRange={initialDateRange} />
    </DashboardClientWrapper>
  );
}
