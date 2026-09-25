import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "./firebase";

export type House = {
  id: string;
  name: string;
  country: string;
  language: string;
  description: string;
};

export async function getHouses(): Promise<House[]> {
  const housesQuery = query(
    collection(db, "houses"),
    orderBy("name")
  );

  const snapshot = await getDocs(housesQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as House[];
}