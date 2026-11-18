import JoinRoleView from './JoinRoleView';

export default function CustomerJoinView({ customerPage, onJoin, onLogin }) {
  return <JoinRoleView role="customer" page={customerPage} onJoin={onJoin} onLogin={onLogin} />;
}
