import { Wrench, Zap, Snowflake, Paintbrush, HelpCircle } from 'lucide-react';

const ICON_MAP = {
  Wrench,
  Zap,
  Snowflake,
  Paintbrush
};

export default function DynamicIcon({ name, className = "w-6 h-6" }) {
  const IconComponent = ICON_MAP[name] || HelpCircle;
  return <IconComponent className={className} />;
}