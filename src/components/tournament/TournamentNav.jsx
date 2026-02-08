const TournamentNav = ({ pg, go }) => {
  const items = [
    { id: 'tlobby', icon: '\uD83C\uDFC6', label: 'Lobby' },
    { id: 'tscore', icon: '\uD83C\uDFCC', label: 'Score' },
    { id: 'tboard', icon: '\uD83D\uDCCA', label: 'Board' },
  ];

  return (
    <nav className="nav">
      {items.map(it => (
        <button key={it.id} className={`ni ${pg === it.id ? 'on' : ''}`} onClick={() => go(it.id)}>
          <span className="nii">{it.icon}</span>
          {it.label}
        </button>
      ))}
    </nav>
  );
};

export default TournamentNav;
