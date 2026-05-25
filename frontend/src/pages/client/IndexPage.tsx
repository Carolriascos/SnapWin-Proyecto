import { useNavigate } from "react-router-dom";
import SnapHeader from "../../components/SnapHeader";
import { setGameMode } from "../../utils/gameMode";


export default function IndexPage() {
  const navigate = useNavigate();

  const elegirJuego = (mode: "shake" | "dodge") => {
    setGameMode(mode);
    navigate("/register");
  };

  return (
    <div className="welcome-page">
      <div className="welcome-page__pattern snap-pattern" aria-hidden />

      <div className="welcome-header">
        <SnapHeader showWelcome />
      </div>

      <p className="welcome-pick">Elige tu juego</p>

      <div className="welcome-actions">
        <button type="button" className="btn-shake" onClick={() => elegirJuego("shake")}>
          SHAKE BATTLE
        </button>
        <button type="button" className="btn-dodge" onClick={() => elegirJuego("dodge")}>
          DODGE GAME
        </button>
      </div>
    </div>
  );
}
