import React, { Dispatch, ReactNode, useCallback, useEffect, useState } from "react";
import DraggableEventReceiver from "./DraggableEventReceiver";
import DraggableElementPosition from "./DraggableElementPosition";
import DraggableEvent from "./DraggableEvent";
import useChatContextStore from "../../hooks/useChatContextStore";
import { ILiveChatWidgetContext } from "../../contexts/common/ILiveChatWidgetContext";
import { ILiveChatWidgetAction } from "../../contexts/common/ILiveChatWidgetAction";
import { ConversationState } from "../../contexts/common/ConversationState";

interface DraggableComponentProps {
    elementId: string;
    children: ReactNode;
}

const DraggableComponent = (props: DraggableComponentProps) => {
    const [state, dispatch]: [ILiveChatWidgetContext, Dispatch<ILiveChatWidgetAction>] = useChatContextStore();
    const [initialPosition, setInitializePosition] = useState({offsetLeft: 0, offsetTop: 0});
    const position: DraggableElementPosition = {offsetLeft: 0, offsetTop: 0};
    const delta = {left: 0, top: 0};

    const calculateOffsetsWithinViewport = (id: string) => {
        const draggableElement: HTMLElement | null = document.getElementById(id);
        const positionRelativeToViewport = (draggableElement as HTMLElement).getBoundingClientRect();

        // Restrict widget being within viewport
        if (positionRelativeToViewport.x < 0) {
            position.offsetLeft = 0 - delta.left;
        }

        if (positionRelativeToViewport.y < 0) {
            position.offsetTop = 0 - delta.top;
        }

        if (positionRelativeToViewport.x + positionRelativeToViewport.width > window.innerWidth) {
            position.offsetLeft = window.innerWidth - positionRelativeToViewport.width - delta.left;
        }

        if (positionRelativeToViewport.y + positionRelativeToViewport.height > window.innerHeight) {
            position.offsetTop = window.innerHeight - positionRelativeToViewport.height - delta.top;
        }

        (draggableElement as HTMLElement).style.left = `${position.offsetLeft}px`;
        (draggableElement as HTMLElement).style.top = `${position.offsetTop}px`;
    };

    useEffect(() => {
        console.log("[DraggableComponent]");
        const setInitialPosition = () => {
            console.log("[setInitialPosition]");
            const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
            const initialPosition = {offsetLeft: 0, offsetTop: 0};
            initialPosition.offsetLeft = (draggableElement as HTMLElement).offsetLeft as number;
            initialPosition.offsetTop = (draggableElement as HTMLElement).offsetTop as number;
            setInitializePosition(initialPosition);
        };

        const calculateOffsets = () => {
            const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
            position.offsetLeft = (draggableElement as HTMLElement).offsetLeft as number;
            position.offsetTop = (draggableElement as HTMLElement).offsetTop as number;

            const positionRelativeToViewport = (draggableElement as HTMLElement).getBoundingClientRect();
            delta.left = positionRelativeToViewport.left - position.offsetLeft;
            delta.top = positionRelativeToViewport.top - position.offsetTop;

            calculateOffsetsWithinViewport(props.elementId);
        };

        setInitialPosition();
        calculateOffsets();

        window.addEventListener("resize", calculateOffsets);

        return () => {
            window.removeEventListener("resize", calculateOffsets);
        };
    }, []);

    const postMessage = useCallback((data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const targetWindow = window;
        targetWindow.postMessage(data, "*");
    }, []);

    const resetPosition = () => {
        position.offsetLeft = initialPosition.offsetLeft;
        position.offsetTop = initialPosition.offsetTop;

        postMessage({
            channel: "lcw",
            eventName: "PositionReset",
            position
        });

        const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
        (draggableElement as HTMLElement).style.left = `${position.offsetLeft}px`;
        (draggableElement as HTMLElement).style.top = `${position.offsetTop}px`;
    };

    useEffect(() => {
        // Resets widget to original position on widget minimized and closed
        if (state.appStates.isMinimized) {
            console.log("[ChatButton][minimize]");
            resetPosition();
        } else if (state.appStates.conversationState == ConversationState.Closed) {
            console.log("[ChatButton][close]");
            resetPosition();
        }
    }, [state.appStates.isMinimized, state.appStates.conversationState, initialPosition]);

    const onEvent = useCallback((event: DraggableEvent) => {
        if (event.eventName === "PositionReset") {
            console.log("[PositionReset]");
            position.offsetLeft = (event as any).position.offsetLeft; // eslint-disable-line @typescript-eslint/no-explicit-any
            position.offsetTop = (event as any).position.offsetTop; // eslint-disable-line @typescript-eslint/no-explicit-any
        } else if (event.eventName === "Dragging") {
            console.log("[Dragging]");
            console.log(event.offset);
            position.offsetLeft += event.offset!.x;
            position.offsetTop += event.offset!.y;

            // Update position via DOM manipulation to prevent <Stack/> continuously rendering on style change causing high CPU spike
            const draggableElement: HTMLElement | null = document.getElementById(props.elementId);
            (draggableElement as HTMLElement).style.left = `${position.offsetLeft}px`;
            (draggableElement as HTMLElement).style.top = `${position.offsetTop}px`;

            calculateOffsetsWithinViewport(props.elementId);
        }
    }, []);

    return (
        <>
            <DraggableEventReceiver channel="lcw" onEvent={onEvent}>
                {props.children}
            </DraggableEventReceiver>
        </>
    );
};

export default DraggableComponent;