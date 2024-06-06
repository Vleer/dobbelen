import React from "react";
import { useQuery } from "react-query";
import { fetchData, Data } from "../api/api";

const DataFetcher: React.FC = () => {
  const { data, error, isLoading } = useQuery<Data[], Error>("data", fetchData);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Fetched Data</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default DataFetcher;
