// src/components/Stepper.jsx
export default function Stepper({ step = 1, labels = ["กรอกข้อมูลการจอง","ชำระเงิน","สำเร็จ"] }) {
  return (
    <ol className="stp stp--animate" aria-label="Booking steps">
      {labels.map((label, i) => {
        const index = i + 1;
        const isCompleted = index < step;
        const isActive    = index === step;
        return (
          <li key={label} className={`stp-item ${isCompleted ? "is-completed" : ""} ${isActive ? "is-active" : ""}`}>
            <span className="stp-line" />
            <span className="stp-lineFill" />
            <div className="stp-circle">{index}</div>
            <div className="stp-label">{label}</div>
          </li>
        );
      })}
    </ol>
  );
}
