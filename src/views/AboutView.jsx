import { useLanguage } from '../hooks/useLanguage';
import ContentPageView from '../components/content/ContentPageView';

export default function AboutView() {
  const { t } = useLanguage();

  return <ContentPageView page={t.pages.about} />;
}