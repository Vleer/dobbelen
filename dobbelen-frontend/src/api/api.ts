import axiosInstance from "./axios";

export interface Data {
  id: number;
  name: string;
  // Add more fields as necessary
}

export const fetchData = async (): Promise<Data[]> => {
  const response = await axiosInstance.get<Data[]>("/endpoint");
  return response.data;
};

export const postData = async (data: Data): Promise<Data> => {
  const response = await axiosInstance.post<Data>("/endpoint", data);
  return response.data;
};
