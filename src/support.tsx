import { useContext, useEffect, useState } from "preact/hooks";
import { route } from "preact-router";
import {
  isDeleting,
  isPending,
  loadAllOpenTickets,
  loadTeam,
  loadTeamTickets,
  loadSession,
  loadUser,
  logError,
  mapFields,
  pendingMutations,
  sendUpdate,
  StateCtx,
  TicketStatus,
} from "./app.tsx";
import { EditableText } from "./editableText.tsx";
import { Footer } from "./footer.tsx";
import { Header } from "./header.tsx";
import { TeamLabel, teamLabelText } from "./models.tsx";
import { decoder, encoder } from "./utils.ts";
import { enroll, signin } from "./webauthn.tsx";

type TicketStatusType = (typeof TicketStatus)[keyof typeof TicketStatus];

function statusLabel(status: TicketStatusType | undefined): string {
  switch (status) {
    case TicketStatus.AwaitingCustomer:
      return "Awaiting Customer";
    case TicketStatus.AwaitingSupport:
      return "Awaiting Support";
    case TicketStatus.Closed:
      return "Closed";
    default:
      return "Awaiting Customer";
  }
}

interface Ticket {
  id: number;
  teamId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  status: TicketStatusType;
  messageCount: number;
  createdBy: number;
}

interface TicketMessage {
  id: number;
  ticketId: number;
  userId: number;
  fromSupport: boolean;
  content: string;
  createdAt: Date;
}

const messageMapping = { id: 1, ticketId: 2, userId: 3, fromSupport: 4, content: 5, rawCreatedAt: 6 };

function decodeMessage(m: Map<number, any>): TicketMessage {
  const { id = 0, ticketId = 0, userId = 0, fromSupport = false, content = "", rawCreatedAt } = mapFields(m, messageMapping);
  return {
    id,
    ticketId,
    userId,
    fromSupport,
    content,
    createdAt:
      rawCreatedAt instanceof Date
        ? rawCreatedAt
        : new Date((rawCreatedAt || 0) * 1000),
  };
}

// Fetch message content from S3 via HTTP API
async function fetchMessageContent(
  ticketId: number,
  afterId: number = 0,
): Promise<TicketMessage[]> {
  const m = new Map<number, any>();
  m.set(1, ticketId);
  if (afterId > 0) m.set(2, afterId);

  const response = await fetch("/api/web/tickets/content", {
    method: "POST",
    body: encoder.encode(m),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length === 0) return [];

  const resp = decoder.decode(data) as Map<number, any>;
  const { messages = [] } = mapFields(resp, { messages: 1 });
  return messages.map((msg: Map<number, any>) => decodeMessage(msg));
}

// Spinner component for pending mutations
function MutationSpinner() {
  return <span class="mutation-spinner">⟳</span>;
}

// WebSocket mutations for tickets
function createTicket(teamId: number, title: string, message: string) {
  const m = new Map<number, any>();
  m.set(1, title);
  if (message) m.set(3, message);
  sendUpdate(["T", teamId], m, "create");
}

function updateTicketTitle(ticketId: number, title: string) {
  sendUpdate(["T", ticketId], new Map([[1, title]]), "update");
}

function updateTicketStatus(ticketId: number, status: TicketStatusType) {
  sendUpdate(["T", ticketId], new Map([[2, status]]), "update");
}

function addMessage(
  ticketId: number,
  content: string,
  status?: TicketStatusType,
) {
  const msg = new Map<number, any>([[1, content]]);
  if (status !== undefined) msg.set(2, status);
  sendUpdate(["T", ticketId, "m"], msg, "create");
}

function deleteTicket(ticketId: number) {
  sendUpdate(["T", ticketId], undefined, "delete");
}

function formatDate(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}

function TicketList({
  tickets,
  onSelect,
  onNew,
  isHelpdesk,
}: {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
  onNew?: () => void;
  isHelpdesk?: boolean;
}) {
  const state = useContext(StateCtx).value;
  // Subscribe to pending mutations for reactivity
  void pendingMutations.value;

  const categoryLabel = (s: TicketStatusType | undefined) => {
    const status = s ?? TicketStatus.AwaitingCustomer;
    if (status === TicketStatus.Closed) return "Closed";
    if (isHelpdesk) {
      return status === TicketStatus.AwaitingSupport
        ? "Awaiting me"
        : "Awaiting customer";
    }
    return status === TicketStatus.AwaitingCustomer
      ? "Awaiting me"
      : "Awaiting support";
  };

  const statusOrder = (s: TicketStatusType | undefined) => {
    const status = s ?? TicketStatus.AwaitingCustomer;
    if (isHelpdesk) {
      if (status === TicketStatus.AwaitingSupport) return 0;
      if (status === TicketStatus.AwaitingCustomer) return 1;
    } else {
      if (status === TicketStatus.AwaitingCustomer) return 0;
      if (status === TicketStatus.AwaitingSupport) return 1;
    }
    return 2; // Closed
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    const statusDiff = statusOrder(a.status) - statusOrder(b.status);
    if (statusDiff !== 0) return statusDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // Group tickets by category
  const categories = [
    { label: "Awaiting me", icon: "🟡" },
    {
      label: isHelpdesk ? "Awaiting customer" : "Awaiting support",
      icon: "🔵",
    },
    { label: "Closed", icon: "⚫" },
  ];
  const grouped = new Map<string, Ticket[]>();
  for (const cat of categories) grouped.set(cat.label, []);
  for (const ticket of sortedTickets) {
    const label = categoryLabel(ticket.status);
    grouped.get(label)!.push(ticket);
  }

  return (
    <section>
      {onNew && (
        <p>
          <button onClick={onNew}>➕ New Conversation</button>
        </p>
      )}
      {sortedTickets.length === 0 ? (
        <p>
          <em>No conversations yet.</em>
        </p>
      ) : (
        categories.map((cat) => {
          const catTickets = grouped.get(cat.label)!;
          if (catTickets.length === 0) return null;
          return (
            <div key={cat.label}>
              <h3>
                {cat.icon} {cat.label}
              </h3>
              <ul class="ticket-list">
                {catTickets.map((ticket) => {
                  const team = loadTeam(state, ticket.teamId);
                  const msgCount = ticket.messageCount || 0;
                  const ticketKey = ["T", ticket.id];
                  const deleting = isDeleting(ticketKey);
                  const pending = isPending(ticketKey);

                  return (
                    <li
                      key={ticket.id}
                      class={`ticket-item ${deleting ? "deleting" : pending ? "pending" : ""}`}
                      onClick={() => !deleting && onSelect(ticket)}
                    >
                      <span class="ticket-title">
                        {ticket.title || "Untitled"}
                        {pending && <MutationSpinner />}
                      </span>
                      <span class="ticket-meta">
                        <TeamLabel id={ticket.teamId} name={team?.name} /> ·{" "}
                        {msgCount} message{msgCount === 1 ? "" : "s"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

function TicketView({
  ticket,
  messages,
  isSupport,
  onBack,
  onUpdate,
  onSendMessage,
  onDelete,
}: {
  ticket: Ticket;
  messages: TicketMessage[];
  isSupport: boolean;
  onBack: () => void;
  onUpdate: (title?: string, status?: TicketStatusType) => void;
  onSendMessage: (content: string, status?: TicketStatusType) => void;
  onDelete?: () => void;
}) {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [waitOnMe, setWaitOnMe] = useState(false);
  const state = useContext(StateCtx).value;
  // Subscribe to pending mutations for reactivity
  void pendingMutations.value;

  const ticketKey = ["T", ticket.id];
  const deleting = isDeleting(ticketKey);
  const ticketPending = isPending(ticketKey);

  const handleSend = async (close: boolean = false) => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      let newStatus: TicketStatusType;
      if (close) {
        newStatus = TicketStatus.Closed;
      } else if (waitOnMe) {
        // "Wait on me" keeps the ball in the sender's court
        newStatus = isSupport
          ? TicketStatus.AwaitingSupport
          : TicketStatus.AwaitingCustomer;
      } else {
        // Normal: flip to waiting on the other party
        newStatus = isSupport
          ? TicketStatus.AwaitingCustomer
          : TicketStatus.AwaitingSupport;
      }
      await onSendMessage(newMessage.trim(), newStatus);
      setNewMessage("");
      setWaitOnMe(false);
    } finally {
      setSending(false);
    }
  };

  const sortedMessages = [...messages].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const isClosed = ticket.status === TicketStatus.Closed;

  return (
    <section class={`ticket-view ${deleting ? "deleting" : ""}`}>
      <div class="ticket-actions">
        <button onClick={onBack}>← Back</button>
        <div class="ticket-actions-right">
          <div class="ticket-actions-desktop">
            {!isClosed && (
              <button
                disabled={!!ticketPending}
                onClick={() => onUpdate(undefined, TicketStatus.Closed)}
              >
                ✓ Close
              </button>
            )}
            {isClosed && (
              <button
                disabled={!!ticketPending}
                onClick={() =>
                  onUpdate(undefined, TicketStatus.AwaitingSupport)
                }
              >
                ↺ Reopen
              </button>
            )}
            {onDelete && (
              <button
                class="delete"
                disabled={!!ticketPending}
                onClick={() => {
                  if (confirm("Delete this conversation permanently?")) {
                    onDelete();
                  }
                }}
              >
                🗑 Delete
              </button>
            )}
            {ticketPending && <MutationSpinner />}
          </div>
          <div class="ticket-actions-mobile">
            <button class="burger-btn" onClick={() => setMenuOpen(!menuOpen)}>
              ☰
            </button>
            {menuOpen && (
              <div class="burger-menu">
                {!isClosed && (
                  <button
                    disabled={!!ticketPending}
                    onClick={() => {
                      onUpdate(undefined, TicketStatus.Closed);
                      setMenuOpen(false);
                    }}
                  >
                    ✓ Close
                  </button>
                )}
                {isClosed && (
                  <button
                    disabled={!!ticketPending}
                    onClick={() => {
                      onUpdate(undefined, TicketStatus.AwaitingSupport);
                      setMenuOpen(false);
                    }}
                  >
                    ↺ Reopen
                  </button>
                )}
                {onDelete && (
                  <button
                    disabled={!!ticketPending}
                    onClick={() => {
                      if (confirm("Delete this conversation permanently?")) {
                        onDelete();
                        setMenuOpen(false);
                      }
                    }}
                  >
                    🗑 Delete
                  </button>
                )}
                {ticketPending && <MutationSpinner />}
              </div>
            )}
          </div>
        </div>
      </div>
      <h2>
        <EditableText
          value={ticket.title}
          placeholder="Conversation title"
          whenMissing="Untitled"
          buttonText="rename"
          submit={(v) => onUpdate(v, undefined)}
        />
        {ticketPending && <MutationSpinner />}
      </h2>
      <p class="ticket-status">
        Status: <strong>{statusLabel(ticket.status)}</strong> · Created:{" "}
        {formatDate(ticket.createdAt)} · Updated: {formatDate(ticket.updatedAt)}
      </p>

      {!isClosed && (
        <div class="message-input">
          <textarea
            value={newMessage}
            onInput={(e) =>
              setNewMessage((e.target as HTMLTextAreaElement).value)
            }
            placeholder="Type your message…"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleSend(false);
              }
            }}
          />
          <div class="message-input-actions">
            {isSupport && (
              <label>
                <input
                  type="checkbox"
                  checked={waitOnMe}
                  onChange={(e) =>
                    setWaitOnMe((e.target as HTMLInputElement).checked)
                  }
                />{" "}
                Wait on me
              </label>
            )}
            <button
              onClick={() => handleSend(false)}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? "Sending…" : "Send"}
            </button>
            <button
              onClick={() => handleSend(true)}
              disabled={sending || !newMessage.trim()}
            >
              Close & Send
            </button>
          </div>
        </div>
      )}

      <div class="messages">
        {sortedMessages.length === 0 ? (
          <p>
            <em>No messages yet. Start the conversation!</em>
          </p>
        ) : (
          sortedMessages.map((msg) => {
            const user = loadUser(state, msg.userId);
            return (
              <div
                key={msg.id}
                class={`message ${msg.fromSupport ? "support" : "user"}`}
              >
                <div class="message-header">
                  <span class="message-author">
                    {msg.fromSupport
                      ? "🛡️ Support"
                      : `👤 ${user?.name || `User #${msg.userId}`}`}
                  </span>
                  <span class="message-time">{formatDate(msg.createdAt)}</span>
                </div>
                <div class="message-content">{msg.content}</div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export function Support({ id }: { id?: string }) {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;
  const user = uid !== undefined ? loadUser(state, uid) : undefined;

  const selectedTicketId = id ? Number(id) : null;
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");

  // Get user's teams
  const teamIds = user?.teams ? Array.from(user.teams.keys()) : [];

  // Set default team if not set
  useEffect(() => {
    if (teamIds.length > 0 && selectedTeamId === null) {
      setSelectedTeamId(teamIds[0]);
    }
  }, [teamIds, selectedTeamId]);

  // Get all tickets for user's teams (including closed)
  const allTeamTickets = loadTeamTickets(state, teamIds);
  const tickets: Ticket[] = allTeamTickets.map((t) => ({
    id: t.id,
    teamId: t.teamId,
    title: t.title,
    createdAt:
      t.createdAt instanceof Date
        ? t.createdAt
        : new Date((t.createdAt as unknown as number) * 1000),
    updatedAt:
      t.updatedAt instanceof Date
        ? t.updatedAt
        : new Date((t.updatedAt as unknown as number) * 1000),
    status: t.status as TicketStatusType,
    messageCount: t.messageCount,
    createdBy: t.createdBy,
  }));

  // Look up selected ticket from global state (so updates are reflected)
  const selectedTicket =
    selectedTicketId !== null
      ? tickets.find((t) => t.id === selectedTicketId) || null
      : null;

  const loadMessages = async (ticketId: number) => {
    try {
      const msgs = await fetchMessageContent(ticketId);
      setMessages(msgs);
    } catch (err) {
      logError(err instanceof Error ? err : String(err));
    }
  };

  useEffect(() => {
    if (selectedTicketId && uid !== undefined) {
      loadMessages(selectedTicketId);
    }
  }, [selectedTicketId, uid]);

  // Reload messages when the ticket's message count changes (new message from WebSocket)
  useEffect(() => {
    if (uid !== undefined && selectedTicket && selectedTicket.messageCount > messages.length) {
      const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      fetchMessageContent(selectedTicket.id, lastMessageId)
        .then((newMsgs) => {
          if (newMsgs.length > 0) {
            setMessages((prev) => [...prev, ...newMsgs]);
          }
        })
        .catch((err) => logError(err instanceof Error ? err : String(err)));
    }
  }, [selectedTicket?.messageCount, uid]);

  const handleNewTicket = () => {
    setShowNewTicketForm(true);
    setNewTicketTitle("");
    setNewTicketMessage("");
  };

  const handleSubmitNewTicket = () => {
    if (selectedTeamId === null || !newTicketTitle.trim()) return;
    createTicket(
      selectedTeamId,
      newTicketTitle.trim(),
      newTicketMessage.trim(),
    );
    setShowNewTicketForm(false);
    setNewTicketTitle("");
    setNewTicketMessage("");
  };

  const handleUpdateTicket = (title?: string, status?: TicketStatusType) => {
    if (!selectedTicket) return;
    if (title !== undefined) {
      updateTicketTitle(selectedTicket.id, title);
    }
    if (status !== undefined) {
      updateTicketStatus(selectedTicket.id, status);
    }
  };

  const handleSendMessage = async (content: string, status?: TicketStatusType) => {
    if (!selectedTicket) return;
    addMessage(selectedTicket.id, content, status);
  };

  if (!state.ready) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main>
          <h1>
            <span class="icon">💬</span>Support
          </h1>
          <p>Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (uid === undefined) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main>
          <h1>
            <span class="icon">💬</span>Support
          </h1>
          <section>
            <p>Sign in to access support.</p>
            <p>
              <button onClick={() => enroll().catch(logError)}>
                🤗 Sign up
              </button>{" "}
              <button onClick={() => signin().catch(logError)}>
                🚪 Sign in
              </button>
            </p>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <main>
        <h1>
          <span class="icon">💬</span>Support
        </h1>
        {selectedTicket ? (
          <TicketView
            ticket={selectedTicket}
            messages={messages}
            isSupport={false}
            onBack={() => {
              route("/support");
              setMessages([]);
            }}
            onUpdate={handleUpdateTicket}
            onSendMessage={handleSendMessage}
          />
        ) : showNewTicketForm ? (
          <section>
            <h2>New Conversation</h2>
            {teamIds.length > 1 && (
              <p>
                <select
                  value={selectedTeamId ?? ""}
                  onChange={(e) =>
                    setSelectedTeamId(
                      Number((e.target as HTMLSelectElement).value),
                    )
                  }
                >
                  {teamIds.map((tid) => {
                    const team = loadTeam(state, tid);
                    return (
                      <option
                        key={tid}
                        value={tid}
                        style={team?.name ? {} : { fontStyle: "italic" }}
                      >
                        {teamLabelText(tid, team?.name)}
                      </option>
                    );
                  })}
                </select>
              </p>
            )}
            <p>
              <input
                type="text"
                value={newTicketTitle}
                onInput={(e) =>
                  setNewTicketTitle((e.target as HTMLInputElement).value)
                }
                placeholder="Title…"
                class="full-width"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowNewTicketForm(false);
                }}
                autoFocus
              />
            </p>
            <p>
              <textarea
                value={newTicketMessage}
                onInput={(e) =>
                  setNewTicketMessage((e.target as HTMLTextAreaElement).value)
                }
                placeholder="Start the conversation…"
                class="full-width"
                rows={5}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleSubmitNewTicket();
                  }
                  if (e.key === "Escape") setShowNewTicketForm(false);
                }}
              />
            </p>
            <p>
              <button
                onClick={handleSubmitNewTicket}
                disabled={!newTicketTitle.trim() || selectedTeamId === null}
              >
                Start Conversation
              </button>{" "}
              <button onClick={() => setShowNewTicketForm(false)}>
                Cancel
              </button>
            </p>
          </section>
        ) : (
          <TicketList
            tickets={tickets}
            onSelect={(ticket) => route(`/support/${ticket.id}`)}
            onNew={handleNewTicket}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export function Helpdesk({ id }: { id?: string }) {
  const state = useContext(StateCtx).value;
  const session = loadSession(state);
  const uid = session?.uid;

  const selectedTicketId = id ? Number(id) : null;
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  // Get all tickets from WebSocket state (support team sees all non-closed)
  const allOpenTickets = loadAllOpenTickets(state);
  const tickets: Ticket[] = allOpenTickets.map((t) => ({
    id: t.id,
    teamId: t.teamId,
    title: t.title,
    createdAt:
      t.createdAt instanceof Date
        ? t.createdAt
        : new Date((t.createdAt as unknown as number) * 1000),
    updatedAt:
      t.updatedAt instanceof Date
        ? t.updatedAt
        : new Date((t.updatedAt as unknown as number) * 1000),
    status: t.status as TicketStatusType,
    messageCount: t.messageCount,
    createdBy: t.createdBy,
  }));
  const isSupport = session?.isSupport || false;

  // Look up selected ticket from global state (so updates are reflected)
  const selectedTicket =
    selectedTicketId !== null
      ? tickets.find((t) => t.id === selectedTicketId) || null
      : null;

  const loadMessages = async (ticketId: number) => {
    try {
      const msgs = await fetchMessageContent(ticketId);
      setMessages(msgs);
    } catch (err) {
      logError(err instanceof Error ? err : String(err));
    }
  };

  useEffect(() => {
    if (selectedTicketId && uid !== undefined) {
      loadMessages(selectedTicketId);
    }
  }, [selectedTicketId, uid]);

  // Reload messages when the ticket's message count changes (new message from WebSocket)
  useEffect(() => {
    if (uid !== undefined && selectedTicket && selectedTicket.messageCount > messages.length) {
      const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      fetchMessageContent(selectedTicket.id, lastMessageId)
        .then((newMsgs) => {
          if (newMsgs.length > 0) {
            setMessages((prev) => [...prev, ...newMsgs]);
          }
        })
        .catch((err) => logError(err instanceof Error ? err : String(err)));
    }
  }, [selectedTicket?.messageCount, uid]);

  const handleUpdateTicket = (title?: string, status?: TicketStatusType) => {
    if (!selectedTicket) return;
    if (title !== undefined) {
      updateTicketTitle(selectedTicket.id, title);
    }
    if (status !== undefined) {
      updateTicketStatus(selectedTicket.id, status);
    }
  };

  const handleSendMessage = async (content: string, status?: TicketStatusType) => {
    if (!selectedTicket) return;
    addMessage(selectedTicket.id, content, status);
  };

  const handleDeleteTicket = () => {
    if (!selectedTicket) return;
    deleteTicket(selectedTicket.id);
    route("/helpdesk");
    setMessages([]);
  };

  if (!state.ready) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main>
          <h1>
            <span class="icon">🛡️</span>Helpdesk
          </h1>
          <p>Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (uid === undefined) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main>
          <h1>
            <span class="icon">🛡️</span>Helpdesk
          </h1>
          <section>
            <p>Sign in to access helpdesk.</p>
            <p>
              <button onClick={() => signin().catch(logError)}>
                🚪 Sign in
              </button>
            </p>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isSupport) {
    return (
      <div class="with-header">
        <Header session={session} />
        <main>
          <h1>
            <span class="icon">🛡️</span>Helpdesk
          </h1>
          <section>
            <p>
              You don't have access to the helpdesk. This area is for support
              team members only.
            </p>
            <p>
              <a href="/support">Go to Support</a>
            </p>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <main>
        <h1>
          <span class="icon">🛡️</span>Helpdesk
        </h1>
        {selectedTicket ? (
          <TicketView
            ticket={selectedTicket}
            messages={messages}
            isSupport={true}
            onBack={() => {
              route("/helpdesk");
              setMessages([]);
            }}
            onUpdate={handleUpdateTicket}
            onSendMessage={handleSendMessage}
            onDelete={handleDeleteTicket}
          />
        ) : (
          <TicketList
            tickets={tickets}
            onSelect={(ticket) => route(`/helpdesk/${ticket.id}`)}
            isHelpdesk
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
