export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-apple bg-[#fff2f2] px-4 py-3 text-[14px] text-[#c0392b]">
      {message}
    </div>
  );
}
