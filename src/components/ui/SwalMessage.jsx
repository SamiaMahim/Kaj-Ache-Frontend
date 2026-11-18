import { useEffect } from 'react';
import { errorAlert, successToast } from '../../utils/alerts';

// Shows `message` as a SweetAlert (error dialog or success toast) each time it changes to a
// non-empty value. Renders nothing itself.
export default function SwalMessage({ message, type = 'error' }) {
  useEffect(() => {
    if (!message) return;
    if (type === 'success') successToast(message);
    else errorAlert('Error', message);
  }, [message, type]);
  return null;
}
