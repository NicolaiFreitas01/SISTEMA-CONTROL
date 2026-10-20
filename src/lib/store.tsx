import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { initialData, demoData, type Data } from "./domain";
type Store = {
  data: Data;
  commit: (next: Data) => Promise<void>;
  demo: boolean;
  busy: boolean;
  error: string;
  session: Session | null;
  enterDemo: () => void;
  exit: () => void;
  revision: number;
  ready: boolean;
};
const Context = createContext<Store>(null!);
export const useStore = () => useContext(Context);
export function Provider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(initialData),
    [demo, setDemo] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [session, setSession] = useState<Session | null>(null),
    [revision, setRevision] = useState(0),
    [loadedUser, setLoadedUser] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s),
    );
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session || demo || !supabase) return;
    setBusy(true);
    setError("");
    supabase
      .from("workspaces")
      .select("data,revision")
      .eq("owner_id", session.user.id)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (error) setError(error.message);
        else if (row) {
          setData(row.data as Data);
          setRevision(row.revision);
          setLoadedUser(session.user.id);
        } else {
          setData(initialData());
          setRevision(0);
          setLoadedUser(session.user.id);
        }
        setBusy(false);
      });
  }, [session, demo]);
  async function commit(next: Data) {
    if (lock.current) throw new Error("Aguarde a gravação atual.");
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (demo) {
        localStorage.setItem("labirinex-demo", JSON.stringify(next));
      } else {
        if (!session || !supabase)
          throw new Error(
            "Conecte o Supabase e faça login para salvar dados reais.",
          );
        const { data: rev, error } = await supabase.rpc("save_workspace", {
          payload: next,
          expected_revision: revision,
        });
        if (error) throw new Error(error.message);
        setRevision(rev);
      }
      setData(next);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function enterDemo() {
    setError("");
    let d: Data;
    try {
      const v = localStorage.getItem("labirinex-demo");
      d = v ? JSON.parse(v) : demoData();
    } catch {
      d = demoData();
    }
    setData(d);
    setDemo(true);
  }
  function exit() {
    setDemo(false);
    setLoadedUser("");
    setData(initialData());
    if (session) supabase?.auth.signOut();
  }
  return (
    <Context.Provider
      value={{
        data,
        commit,
        demo,
        busy,
        error,
        session,
        enterDemo,
        exit,
        revision,
        ready: demo || (!!session && loadedUser === session.user.id),
      }}
    >
      {children}
    </Context.Provider>
  );
}
