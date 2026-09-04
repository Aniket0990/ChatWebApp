export default function DarkMode() {
  const toggle = () => {
    document.documentElement.classList.toggle("dark");
  };

  return <button onClick={toggle}>🌙</button>;
}