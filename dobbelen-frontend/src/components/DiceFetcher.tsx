import React from "react";
import { useQuery } from "react-query";
import { Data, fetchDice } from "../api/api";

const DiceFetcher: React.FC = () => {
  const { data, error, isLoading } = useQuery<Data[], Error>("data", fetchDice);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Dice Data</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default DiceFetcher;
