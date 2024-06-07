import React from "react";

interface DiceProps {
  value: number;
}

const Dice: React.FC<DiceProps> = ({ value }) => {
  const renderDots = (num: number) => {
    switch (num) {
      case 1:
        return (
          <div
            className="w-2 h-2 bg-black rounded-full absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          ></div>
        );
      case 2:
        return (
          <>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "25%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", right: "25%" }}
            ></div>
          </>
        );
      case 3:
        return (
          <>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "25%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", right: "25%" }}
            ></div>
          </>
        );
      case 4:
        return (
          <>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "25%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "25%", right: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", right: "25%" }}
            ></div>
          </>
        );
      case 5:
        return (
          <>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "25%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "25%", right: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", right: "25%" }}
            ></div>
          </>
        );
      case 6:
        return (
          <>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "20%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "20%", right: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "40%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ top: "40%", right: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", left: "25%" }}
            ></div>
            <div
              className="w-2 h-2 bg-black rounded-full absolute"
              style={{ bottom: "25%", right: "25%" }}
            ></div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-12 h-12 bg-white border border-black rounded-lg flex items-center justify-center m-1">
      {renderDots(value)}
    </div>
  );
};

export default Dice;
