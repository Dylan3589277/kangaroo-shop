import DashboardClientWrapper from '../components/DashboardClientWrapper';
import { AlertCenterPage } from '../components/AlertCenterPage';

export default function DashboardAlertsPage() {
  return (
    <DashboardClientWrapper>
      <AlertCenterPage />
    </DashboardClientWrapper>
  );
}
