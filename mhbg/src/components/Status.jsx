export default function Status({ status }) {
  if (!status) return null;
  return (
    <div className={`form-status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>
      {status.msg}
    </div>
  );
}
