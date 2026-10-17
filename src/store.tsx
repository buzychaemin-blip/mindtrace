import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { makeDemo, makeEmpty, validateData, type AppData } from "./domain";
export type Mode = "demo" | "personal";
const key = (mode: Mode) => `mindtrace:v1:${mode}`;
// IndexedDB transactions serialize mutations across tabs; localStorage is a cache.
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("mindtrace-v1", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("workspaces");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error("브라우저 저장소를 열 수 없어요. 저장 권한을 확인해 주세요."),
      );
  }));
}
function readCache(mode: Mode) {
  const raw = localStorage.getItem(key(mode));
  return raw
    ? validateData(JSON.parse(raw))
    : mode === "demo"
      ? makeDemo()
      : makeEmpty();
}
async function transaction(
  mode: Mode,
  mutation?: (d: AppData) => void,
  replace?: AppData,
) {
  const connection = await db();
  return new Promise<AppData>((resolve, reject) => {
    const tx = connection.transaction(
      "workspaces",
      mutation || replace ? "readwrite" : "readonly",
    );
    const store = tx.objectStore("workspaces");
    const req = store.get(key(mode));
    let next: AppData;
    let failure: unknown;
    req.onsuccess = () => {
      try {
        const current = replace
          ? {
              revision: Number.isInteger(req.result?.revision)
                ? req.result.revision
                : 0,
            }
          : req.result
            ? validateData(req.result)
            : readCache(mode);
        next = replace
          ? structuredClone(replace)
          : structuredClone(current as AppData);
        if (mutation) mutation(next);
        if (mutation || replace) {
          next.revision = current.revision + 1;
          store.put(next, key(mode));
        }
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () =>
      reject(
        failure ??
          new Error(
            "기록을 저장하지 못했어요. 저장 공간과 브라우저 권한을 확인해 주세요.",
          ),
      );
    tx.onerror = () => {
      failure ??= new Error(
        "브라우저 저장 공간이 부족하거나 접근이 제한됐어요.",
      );
    };
  });
}
type Store = {
  data: AppData;
  mode: Mode;
  change: (fn: (d: AppData) => void) => Promise<void>;
  switchMode: (m: Mode) => void;
  reset: () => Promise<void>;
  error: string;
  clearError: () => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() =>
    localStorage.getItem("mindtrace:mode") === "personal" ? "personal" : "demo",
  );
  const [error, setError] = useState("");
  const [data, setData] = useState<AppData>(() => {
    try {
      return readCache(mode);
    } catch {
      const empty = makeEmpty();
      empty.profile.onboarded = true;
      return empty;
    }
  });
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const present = (target: Mode, next: AppData) => {
    if (modeRef.current === target) setData(next);
    try {
      localStorage.setItem(key(target), JSON.stringify(next));
    } catch {
      setError(
        "IndexedDB에는 저장했지만 빠른 복구 캐시를 쓰지 못했어요. 브라우저 저장 권한을 확인해 주세요.",
      );
    }
  };
  useEffect(() => {
    let disposed = false;
    transaction(mode)
      .then((next) => {
        if (!disposed) present(mode, next);
      })
      .catch(() => {
        if (!disposed)
          setError(
            "저장 데이터를 읽지 못했어요. 손상된 원본은 자동으로 덮어쓰지 않습니다. 브라우저 저장 권한을 확인해 주세요.",
          );
      });
    return () => {
      disposed = true;
    };
  }, [mode]);
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key(mode))
        transaction(mode)
          .then((next) => {
            if (modeRef.current === mode) setData(next);
          })
          .catch(() => setError("다른 탭의 변경 내용을 불러오지 못했어요."));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [mode]);
  const change = async (fn: (d: AppData) => void) => {
    const target = modeRef.current;
    try {
      const next = await transaction(target, fn);
      present(target, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
      throw e;
    }
  };
  const switchMode = (m: Mode) => {
    try {
      const next = readCache(m);
      localStorage.setItem("mindtrace:mode", m);
      setMode(m);
      setData(next);
      setError("");
    } catch {
      setError("선택한 모드의 저장 데이터를 읽지 못했어요.");
    }
  };
  const reset = async () => {
    const target = modeRef.current;
    const next = makeEmpty();
    next.profile.onboarded = true;
    try {
      present(target, await transaction(target, undefined, next));
      setError("");
    } catch (e) {
      setError("삭제하지 못했어요. 브라우저 저장 권한을 확인해 주세요.");
      throw e;
    }
  };
  return (
    <Context.Provider
      value={{
        data,
        mode,
        change,
        switchMode,
        reset,
        error,
        clearError: () => setError(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const s = useContext(Context);
  if (!s) throw new Error("StoreProvider required");
  return s;
}
