import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, ROUTE_SEGMENTS } from "../src/routes.js";

export default function Home() {
  redirect(`/${DEFAULT_LOCALE}/${ROUTE_SEGMENTS[DEFAULT_LOCALE]}`);
}
