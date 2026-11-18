// SweetAlert2 is loaded on first use so it stays out of the main bundle
const BRAND = '#166534'; // green-800
const DANGER = '#dc2626'; // red-600

let swalPromise;
const getSwal = () => {
  swalPromise ??= import('sweetalert2').then(({ default: Swal }) => Swal.mixin({
    reverseButtons: true,
    confirmButtonColor: BRAND,
    cancelButtonColor: '#94a3b8',
  }));
  return swalPromise;
};

// Returns true when the user confirms
export const confirmDialog = async ({ title, text, confirmText = 'Yes', cancelText = 'Cancel', danger = false, icon = 'question' }) => {
  const Swal = await getSwal();
  const result = await Swal.fire({
    title,
    text,
    icon: danger ? 'warning' : icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? DANGER : BRAND,
    focusCancel: danger,
  });
  return result.isConfirmed;
};

export const successToast = async (title) => {
  const Swal = await getSwal();
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  });
};

export const errorAlert = async (title, text) => {
  const Swal = await getSwal();
  return Swal.fire({ icon: 'error', title, text });
};

// Single-line text prompt; resolves the value, or null when dismissed
export const promptInput = async (title, defaultValue = '') => {
  const Swal = await getSwal();
  const result = await Swal.fire({
    title,
    input: 'text',
    inputValue: defaultValue,
    showCancelButton: true,
    confirmButtonText: 'OK',
  });
  return result.isConfirmed ? result.value : null;
};

// Confirm with a free-text reason; resolves the trimmed reason, or null when dismissed
export const reasonDialog = async ({ title, text, placeholder = 'Reason', confirmText = 'Confirm', required = false, danger = false }) => {
  const Swal = await getSwal();
  const result = await Swal.fire({
    title,
    text,
    icon: danger ? 'warning' : 'question',
    input: 'textarea',
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: confirmText,
    confirmButtonColor: danger ? DANGER : BRAND,
    focusCancel: danger,
    inputValidator: (value) => (required && !value?.trim() ? 'Please enter a reason' : undefined),
  });
  return result.isConfirmed ? (result.value || '').trim() : null;
};

// Two-field report form; resolves { title, reason } or null when dismissed. Labels can be translated.
export const reportDialog = async ({
  heading = 'Report a problem',
  subjectPlaceholder = 'Subject',
  reasonPlaceholder = 'What went wrong?',
  confirmText = 'Submit report',
  cancelText = 'Cancel',
  requiredText = 'Please fill in both fields',
} = {}) => {
  const Swal = await getSwal();
  const result = await Swal.fire({
    title: heading,
    html: `
      <input id="report-title" class="swal2-input" maxlength="120" style="width:85%;margin:8px auto">
      <textarea id="report-reason" class="swal2-textarea" maxlength="2000" style="width:85%;margin:8px auto"></textarea>`,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: DANGER,
    focusConfirm: false,
    didOpen: () => {
      // Set as properties so translated text never goes through the HTML string
      document.getElementById('report-title')?.setAttribute('placeholder', subjectPlaceholder);
      document.getElementById('report-reason')?.setAttribute('placeholder', reasonPlaceholder);
    },
    preConfirm: () => {
      const title = document.getElementById('report-title')?.value.trim();
      const reason = document.getElementById('report-reason')?.value.trim();
      if (!title || !reason) {
        Swal.showValidationMessage(requiredText);
        return false;
      }
      return { title, reason };
    },
  });
  return result.isConfirmed ? result.value : null;
};
