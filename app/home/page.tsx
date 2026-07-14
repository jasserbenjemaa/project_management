"use client";
import { Button } from "@base-ui/react";
import { signOut } from "../actions/auth";
const Home = () => {
  return <Button onClick={() => signOut()}>hello from Home</Button>;
};
export default Home;
