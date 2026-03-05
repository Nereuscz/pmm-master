type Props = { message: string; id?: string };

export default function ErrorMessage({ message, id }: Props) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-red-500"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-caption text-red-700">{message}</p>
    </div>
  );
}
