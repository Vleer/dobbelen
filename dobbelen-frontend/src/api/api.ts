import axiosInstance from "./axios";

export interface Data {
  id: number;
  name: string;
  // Add more fields as necessary
}

export const fetchData = async (): Promise<Data[]> => {
  const response = await axiosInstance.get<Data[]>("/hello");
  return response.data;
};

export const postData = async (data: Data): Promise<Data> => {
  const response = await axiosInstance.post<Data>("/move", data);
  return response.data;
};
