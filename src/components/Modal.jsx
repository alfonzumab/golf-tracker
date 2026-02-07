import { T } from '../theme';

const Mdl = ({ title, text, onOk, onNo, okTxt = "Confirm", danger }) => (
  <div className="mbg" onClick={onNo}><div className="mdl" onClick={e => e.stopPropagation()}>
    <div className="mdt">{title}</div><div className="mdtx">{text}</div>
    <div className="fx g8"><button className="btn bs" onClick={onNo}>Cancel</button>
      <button className={`btn ${danger ? "bd" : "bp"}`} onClick={onOk}>{okTxt}</button></div>
  </div></div>
);

export default Mdl;
