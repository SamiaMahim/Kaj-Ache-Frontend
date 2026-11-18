import JoinRoleView from './JoinRoleView';

export default function TechnicianJoinView({ technicianPage, onJoin, onLogin }) {
  return <JoinRoleView role="technician" page={technicianPage} onJoin={onJoin} onLogin={onLogin} />;
}
