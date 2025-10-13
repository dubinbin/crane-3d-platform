import BarCover from "../assets/bar.png";
import "../styles/header.css";
import Logo from "../assets/hkcrc-logo.png";
export default function Header() {
  return (
    <div className="header">
      <img src={BarCover} className="bar-cover" alt="BarCover" />
      <div className="text-box">
        <img src={Logo} className="logo" alt="Logo" />
      </div>
    </div>
  );
}
