// ================= CORE LUDO ENGINE =================

export const MP = [
  [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],
  [0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]
];

export const PC = {
  red:   { si: 0,  c:'#ef4444', hc:[[7,1],[7,2],[7,3],[7,4],[7,5]], tp:[[1,1],[3,1],[1,3],[3,3]] },
  blue:  { si: 13, c:'#3b82f6', hc:[[1,7],[2,7],[3,7],[4,7],[5,7]], tp:[[1,10],[3,10],[1,12],[3,12]] },
  green: { si: 26, c:'#22c55e', hc:[[7,13],[7,12],[7,11],[7,10],[7,9]], tp:[[11,10],[13,10],[11,12],[13,12]] },
  yellow:{ si: 39, c:'#f59e0b', hc:[[13,7],[12,7],[11,7],[10,7],[9,7]], tp:[[11,1],[13,1],[11,3],[13,3]] },
};

export const SAFE = new Set([0,8,13,21,26,34,39,47]);
export const PO = ["red","blue","green","yellow"];

export const CS = 36;

// ================= HELPERS =================

export const CK = (c,r) => `${c},${r}`;

export const coord = (pk,p) => {
  if(p < 0) return null;
  if(p >= 57) return null;

  if(p < 52){
    return MP[(PC[pk].si + p) % 52];
  }

  return PC[pk].hc[p - 52];
};

export const isSafe = (pk,p) => {
  if(p < 0 || p >= 52) return true;
  return SAFE.has((PC[pk].si + p) % 52);
};

// tokens that can move
export const getMovable = (pk, tokens, d) => {
  return tokens
    .filter(t => {
      if(t.p < 0) return d === 6;
      return t.p + d <= 57;
    })
    .map(t => t.id);
};

// ================= MOVE ENGINE =================

export const applyMove = (players, pk, tid, d, actP) => {
  const tok = players[pk].tokens.find(t => t.id === tid);

  let np = tok.p < 0 ? 0 : tok.p + d;

  let newPlayers = {
    ...players,
    [pk]: {
      ...players[pk],
      tokens: players[pk].tokens.map(t =>
        t.id === tid ? { ...t, p: np } : t
      )
    }
  };

  // kill logic
  if(np < 52 && !isSafe(pk,np)){
    const pos = MP[(PC[pk].si + np) % 52];

    actP.forEach(op => {
      if(op === pk) return;

      newPlayers[op] = {
        ...newPlayers[op],
        tokens: newPlayers[op].tokens.map(t => {
          if(t.p < 0 || t.p >= 52) return t;

          const opPos = MP[(PC[op].si + t.p) % 52];

          if(opPos[0] === pos[0] && opPos[1] === pos[1]){
            return { ...t, p: -1 };
          }

          return t;
        })
      };
    });
  }

  return newPlayers;
};

// win check
export const isWin = (tokens) =>
  tokens.every(t => t.p >= 57);
// ================= GAME STATE =================

export const initialState = (players, actP) => ({
  pl: players,
  ci: 0,              // current index
  dice: null,
  rolled: false,
  mv: [],
  winner: null,
  msg: `${players[actP[0]].name}'s turn 🎲`
});

// ================= TURN SYSTEM =================

export const nextTurn = (state, actP, extra = false) => {
  if (state.winner) return state;

  if (extra) {
    const pk = actP[state.ci];
    return {
      ...state,
      dice: null,
      rolled: false,
      mv: [],
      msg: `${state.pl[pk].name} gets extra turn 🎲`
    };
  }

  const next = (state.ci + 1) % actP.length;
  const pk = actP[next];

  return {
    ...state,
    ci: next,
    dice: null,
    rolled: false,
    mv: [],
    msg: `${state.pl[pk].name}'s turn 🎲`
  };
};

// ================= REDUCER =================

import { getMovable, applyMove, isWin } from "./engine";

export function reducer(state, action) {
  switch (action.type) {

    // 🎲 INIT GAME
    case "INIT":
      return initialState(action.players, action.actP);

    // 🎲 ROLL DICE
    case "ROLL": {
      const pk = action.actP[state.ci];
      const mv = getMovable(pk, state.pl[pk].tokens, action.d);

      return {
        ...state,
        dice: action.d,
        rolled: true,
        mv,
        msg: mv.length
          ? `${state.pl[pk].name} rolled ${action.d} — pick token`
          : `${state.pl[pk].name} rolled ${action.d} — no moves`
      };
    }

    // 🚫 PASS TURN
    case "PASS":
      return nextTurn(state, action.actP, state.dice === 6);

    // 🚀 MOVE TOKEN
    case "MOVE": {
      const pk = action.actP[state.ci];
      const d = state.dice;

      const updated = applyMove(
        state.pl,
        pk,
        action.tid,
        d,
        action.actP
      );

      // 🏆 WIN CHECK
      if (isWin(updated[pk].tokens)) {
        return {
          ...state,
          pl: updated,
          winner: pk,
          mv: [],
          rolled: false,
          msg: `🏆 ${updated[pk].name} WINS!`
        };
      }

      // 🎯 extra turn on 6
      return nextTurn(
        {
          ...state,
          pl: updated,
          mv: [],
          rolled: false
        },
        action.actP,
        d === 6
      );
    }

    default:
      return state;
  }
}
import React from "react";
import { MP, PC, coord, CS } from "./engine";

/* ================= BUTTON ================= */
export function Btn({ ch, onClick, g = "#6366f1", s = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        background: g,
        color: "white",
        fontWeight: "bold",
        transition: "0.2s",
        ...s
      }}
    >
      {ch}
    </button>
  );
}

/* ================= CHIP ================= */
export function Chip({ color = "#fff", size = 12 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: "1px solid rgba(0,0,0,0.2)"
      }}
    />
  );
}

/* ================= DICE ================= */
export function Die({ val, onClick, dis }) {
  return (
    <button
      disabled={dis}
      onClick={onClick}
      style={{
        width: 65,
        height: 65,
        fontSize: 22,
        borderRadius: 12,
        border: "none",
        background: "#111827",
        color: "white",
        cursor: dis ? "not-allowed" : "pointer",
        boxShadow: "0 6px 20px rgba(0,0,0,0.3)"
      }}
    >
      🎲 {val || "-"}
    </button>
  );
}

/* ================= BOARD ================= */
export function Board({ gs, actP, onTok }) {
  const SIZE = CS * 15;

  return (
    <div
      style={{
        position: "relative",
        width: SIZE,
        height: SIZE,
        display: "grid",
        gridTemplateColumns: `repeat(15, ${CS}px)`,
        gridTemplateRows: `repeat(15, ${CS}px)`,
        border: "2px solid #334155",
        background: "#0f172a",
        borderRadius: 10,
        overflow: "hidden"
      }}
    >
      {/* GRID CELLS */}
      {Array.from({ length: 225 }).map((_, i) => {
        const c = i % 15;
        const r = Math.floor(i / 15);

        const isCenter = c === 7 && r === 7;

        return (
          <div
            key={i}
            style={{
              width: CS,
              height: CS,
              border: "1px solid #1f2937",
              background: isCenter ? "#111827" : "#0b1220"
            }}
          />
        );
      })}

      {/* TOKENS */}
      {actP.map(pk =>
        gs.pl[pk].tokens.map(t => {
          let x = 0,
            y = 0;

          if (t.p < 0) {
            const [c, r] = PC[pk].tp[t.id];
            x = c * CS;
            y = r * CS;
          } else {
            const [c, r] = coord(pk, t.p);
            x = c * CS;
            y = r * CS;
          }

          const canMove =
            !gs.winner &&
            gs.mv.includes(t.id) &&
            actP[gs.ci] === pk;

          return (
            <div
              key={pk + "-" + t.id}
              onClick={() => canMove && onTok(pk, t.id)}
              style={{
                position: "absolute",
                left: x + CS / 4,
                top: y + CS / 4,
                width: CS / 2,
                height: CS / 2,
                borderRadius: "50%",
                background: PC[pk].c,
                border: canMove ? "3px solid yellow" : "2px solid white",
                cursor: canMove ? "pointer" : "default",
                boxShadow: "0 3px 10px rgba(0,0,0,0.5)"
              }}
            />
          );
        })
      )}
    </div>
  );
        }
import React, { useReducer, useState } from "react";

import { MP, PC, PO, getMovable } from "./engine";
import { reducer } from "./reducer";
import { Board, Die, Btn, Chip } from "./ui";

/* ================= APP ================= */

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu | setup | play
  const [numP, setNumP] = useState(2);

  const [setup, setSetup] = useState({
    red: { name: "Red", type: "human", ai: "easy" },
    blue: { name: "Blue", type: "ai", ai: "easy" },
    green: { name: "Green", type: "ai", ai: "easy" },
    yellow: { name: "Yellow", type: "ai", ai: "easy" }
  });

  const actP = PO.slice(0, numP);

  const [gs, dispatch] = useReducer(reducer, null);

  const startGame = () => {
    const players = {};

    actP.forEach(pk => {
      players[pk] = {
        name: setup[pk].name,
        type: setup[pk].type,
        ai: setup[pk].ai,
        tokens: [
          { id: 0, p: -1 },
          { id: 1, p: -1 },
          { id: 2, p: -1 },
          { id: 3, p: -1 }
        ]
      };
    });

    dispatch({ type: "INIT", players, actP });
    setScreen("play");
  };

  /* ================= DICE ================= */
  const rollDice = () => {
    if (!gs || gs.rolled) return;
    const d = Math.floor(Math.random() * 6) + 1;

    dispatch({ type: "ROLL", d, actP });

    const pk = actP[gs.ci];
    const mv = getMovable(pk, gs.pl[pk].tokens, d);

    if (!mv.length) {
      setTimeout(() => dispatch({ type: "PASS", actP }), 800);
    }
  };

  const onTok = (pk, tid) => {
    dispatch({ type: "MOVE", tid, actP });
  };

  /* ================= MENU ================= */
  if (screen === "menu") {
    return (
      <div style={styles.menu}>
        <h1 style={{ fontSize: 48 }}>🎲 LUDO GAME</h1>

        <Btn ch="▶ Play Game" onClick={() => setScreen("setup")} />
      </div>
    );
  }

  /* ================= SETUP ================= */
  if (screen === "setup") {
    return (
      <div style={styles.setup}>
        <h2>⚙️ Setup</h2>

        <div style={{ display: "flex", gap: 10 }}>
          {[2, 3, 4].map(n => (
            <Btn
              key={n}
              ch={`${n} Players`}
              g={numP === n ? "#22c55e" : "#334155"}
              onClick={() => setNumP(n)}
            />
          ))}
        </div>

        {actP.map(pk => (
          <div key={pk} style={styles.card}>
            <Chip color={PC[pk].c} size={14} />
            <input
              value={setup[pk].name}
              onChange={e =>
                setSetup(s => ({
                  ...s,
                  [pk]: { ...s[pk], name: e.target.value }
                }))
              }
            />
          </div>
        ))}

        <Btn ch="🚀 Start Game" onClick={startGame} />
      </div>
    );
  }

  /* ================= PLAY SCREEN ================= */
  if (!gs) return null;

  const pk = actP[gs.ci];

  return (
    <div style={styles.play}>
      <h3>🎲 Turn: {gs.pl[pk]?.name}</h3>

      {/* BOARD */}
      <Board gs={gs} actP={actP} onTok={onTok} />

      {/* DICE */}
      <div style={styles.panel}>
        <Die val={gs.dice} onClick={rollDice} dis={gs.rolled} />

        <Btn
          ch="Pass"
          g="#ef4444"
          onClick={() => dispatch({ type: "PASS", actP })}
        />
      </div>

      {/* MESSAGE */}
      <p>{gs.msg}</p>

      {/* WINNER */}
      {gs.winner && (
        <div style={styles.win}>
          🏆 {gs.pl[gs.winner].name} Wins!
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  menu: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    background: "#0f172a",
    color: "white"
  },

  setup: {
    padding: 20,
    color: "white",
    background: "#111827",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },

  card: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    background: "#1f2937",
    borderRadius: 10
  },

  play: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: 10,
    background: "#0f172a",
    color: "white",
    minHeight: "100vh"
  },

  panel: {
    display: "flex",
    gap: 10,
    alignItems: "center"
  },

  win: {
    fontSize: 24,
    color: "#22c55e",
    fontWeight: "bold"
  }
};
