import { Metadata } from "next";

import PageTitle from "@/components/shared/PageTitle";
import Archives from "./_components";

export const metadata: Metadata = {
    title: "Archived Products",
};

export default function ArchivesPage() {
    return (
        <section>
            <PageTitle>Archived Products</PageTitle>

            <Archives />
        </section>
    );
}
