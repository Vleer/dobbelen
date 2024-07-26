import React, { useState } from "react";
import { useMutation } from "react-query";
import { postData, Data } from "../api/api";

const DataPoster: React.FC = () => {
  const [inputData, setInputData] = useState<Data>({ id: 0, name: "" });
  const mutation = useMutation<Data, Error, Data>(postData);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate(inputData);
  };

  return (
    <div>
      <h1>Post Data</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputData.name}
          onChange={(e) => setInputData({ ...inputData, name: e.target.value })}
        />
        <button
          type="submit"
          className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded"
        >
          Submit
        </button>
      </form>
      {mutation.isLoading && <p>Loading...</p>}
      {mutation.isError && <p>Error: {mutation.error?.message}</p>}
      {mutation.isSuccess && <p>Success: {JSON.stringify(mutation.data)}</p>}
    </div>
  );
};

export default DataPoster;
