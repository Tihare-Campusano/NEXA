import React, { useState } from "react";
import { IonButton, IonList, IonItem, IonIcon } from "@ionic/react";
import { chevronDownOutline, documentTextOutline } from "ionicons/icons";

interface ReportOption {
    label: string;
    onClick: () => void;
}

interface Props {
    options: ReportOption[];
}

export default function ReportesDropdown({ options }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <IonButton onClick={() => setOpen(!open)}>
                <IonIcon slot="start" icon={documentTextOutline} />
                Reportes
                <IonIcon slot="end" icon={chevronDownOutline} />
            </IonButton>

            {open && (
                <IonList
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        background: "white",
                        borderRadius: "8px",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        minWidth: "220px",
                    }}
                >
                    {options.map((opt, idx) => (
                        <IonItem
                            key={idx}
                            button
                            detail={false}
                            onClick={() => {
                                opt.onClick();
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                        </IonItem>
                    ))}
                </IonList>
            )}
        </div>
    );
}
