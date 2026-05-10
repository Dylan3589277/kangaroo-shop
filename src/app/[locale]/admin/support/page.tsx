import { SupportCenterClient } from './SupportCenterClient';

type Props = {
  params: { locale: string };
};

export default function AdminSupportPage({ params }: Props) {
  return <SupportCenterClient key={params.locale} />;
}
