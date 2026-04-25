import DashboardClientWrapper from './components/DashboardClientWrapper';
import { OverviewPage } from './components/OverviewPage';

export default function DashboardPage() {
  return (
    <DashboardClientWrapper>
      <OverviewPage />
    </DashboardClientWrapper>
  );
}
