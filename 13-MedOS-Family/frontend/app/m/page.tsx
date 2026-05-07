import { Mobile } from '../../components/Mobile';

export default function MobilePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle at 30% 20%, #efebdf, #e4dfd0)',
      padding: 24,
    }}>
      <Mobile/>
    </div>
  );
}
