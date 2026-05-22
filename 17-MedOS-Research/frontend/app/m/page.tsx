import { Mobile } from '../../components/Mobile';

export default function MobilePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 30% 20%, #eef2fb, #d8e2f4)',
      padding: 24,
    }}>
      <Mobile/>
    </div>
  );
}
