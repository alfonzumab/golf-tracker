const Tog = ({ v, onChange, label }) => (
  <div className="tgr"><span className="tgl">{label}</span>
    <button className={`tgb ${v ? "on" : "off"}`} onClick={() => onChange(!v)}><div className="tgk" /></button>
  </div>
);

export default Tog;
