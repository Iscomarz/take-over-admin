import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

export function flatpickrAction(node, { onChange, dateFormat = 'Y-m-d H:i', enableTime = true, defaultDate = null }) {
  const fp = flatpickr(node, {
    enableTime,
    dateFormat,
    defaultDate,
    onChange: (selectedDates, dateStr) => {
      if (onChange) {
        onChange(selectedDates, dateStr);
      }
    }
  });

  return {
    destroy() {
      fp.destroy();
    }
  };
}
