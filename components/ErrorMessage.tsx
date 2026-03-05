type Props = { message: string; id?: string };

export default function ErrorMessage({ message, id }: Props) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className="rounded-apple bg-[#fff2f2] px-4 py-3 text-body text-[#c0392b]"
    >
      {message}
    </div>
  );
}
