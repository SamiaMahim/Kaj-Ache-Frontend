import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import TechnicianJoinView from '../features/auth/TechnicianJoinView';
import CustomerJoinView from '../features/auth/CustomerJoinView';

export default function AuthEntryView({ role: roleProp }) {
  const { role: routeRole } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const role = roleProp || routeRole || 'technician';
  const content = t.authEntry[role] || t.authEntry.technician;
  const EntryView = role === 'technician' ? TechnicianJoinView : CustomerJoinView;
  const entryProps = role === 'technician'
    ? {
        content,
        technicianPage: t.technicianPage,
        onJoin: () => navigate('/register/technician'),
        onLogin: () => navigate('/login/technician'),
      }
    : {
        content,
        customerPage: t.customerPage,
        onJoin: () => navigate(`/register/${role}`),
        onLogin: () => navigate(`/login/${role}`),
      };

  return <EntryView {...entryProps} />;
}
