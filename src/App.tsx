import { TopBar } from "@/components/top-bar";
import { RightSidebar } from "@/components/right-sidebar";
import { SeatingCanvas } from "@/components/seating-canvas";
import s from "./App.module.css";

export default function App() {
  return (
    <div className={s.layout}>
      <TopBar />
      <div className={s.main}>
        <SeatingCanvas />
        <RightSidebar />
      </div>
    </div>
  );
}
