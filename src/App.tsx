import { api } from "./api";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

interface User {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  departamento: string;
  salario: number;
  cidade: string;
  status: string;
}

type CreateUserData = Omit<User, 'id'>;

type PartialUserData = Partial<CreateUserData>;

interface UserFilters {
  nome: string;
  cargo: string;
  status: string;
}

interface Feedback {
  type: "success" | "error";
  message: string;
}

type UserLookupResult =
  | { status: "success"; user: User }
  | { status: "not-found" }
  | { status: "error" };

function userToFormData(user: User): CreateUserData {
  return {
    nome: user.nome ?? "",
    email: user.email ?? "",
    telefone: user.telefone ?? "",
    cargo: user.cargo ?? "",
    departamento: user.departamento ?? "",
    salario: Number.isFinite(user.salario) ? user.salario : 0,
    cidade: user.cidade ?? "",
    status: user.status ?? "Ativo",
  };
}

async function getUserById(id: number): Promise<UserLookupResult> {
  try {
    const response = await api.get<User>(`/funcionarios/${id}`);
    return { status: "success", user: response.data };
  } catch (error) {
    if(axios.isAxiosError(error) && error.response?.status === 404){
      return { status: "not-found" };
    }

    console.log("Error ao buscar dados:", error);
    return { status: "error" };
  }
}

async function postUser(userData: CreateUserData): Promise<User | null>{
  try {
    const response = await api.post<User>('/funcionarios', userData);
    return response.data;
  } catch (error) {
    console.log("Error ao buscar dados:", error);
    return null;
  }
}

async function searchUsers(filters: UserFilters): Promise<User[] | null> {
  try {
    const params = Object.fromEntries(
      Object.entries(filters)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value !== ""),
    );
    const response = await api.get<User[]>('/funcionarios/buscar', { params });
    return response.data;
  } catch (error) {
    console.log("Erro ao filtrar funcionários:", error);
    return null;
  }
}

async function putUser(id: number, userData: CreateUserData): Promise<User | null> {
  try {
    const response = await api.put<User>(`/funcionarios/${id}`, userData);
    return response.data;
  } catch (error) {
    console.log("Erro ao atualizar funcionário:", error);
    return null;
  }
}

async function patchUser(id: number, userData: PartialUserData): Promise<User | null> {
  try {
    const response = await api.patch<User>(`/funcionarios/${id}`, userData);
    return response.data;
  } catch (error) {
    console.log("Erro ao atualizar parcialmente o funcionário:", error);
    return null;
  }
}

async function deleteUser(id: number): Promise<boolean> {
  try {
    await api.delete(`/funcionarios/${id}`);
    return true;
  } catch (error) {
    console.log("Erro ao excluir funcionário:", error);
    return false;
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingGet, setLoadingGet] = useState<boolean>(false);
  const [loadingPost, setLoadingPost] = useState<boolean>(false);
  const [idUser, setUserId] = useState<string>("");
  const [searched, setSearched] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<"not-found" | "request" | null>(null);
  const [posted, setPosted] = useState<"success" | "error" | null>(null);
  const [allUsers, setAllUser] = useState<User[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [filters, setFilters] = useState<UserFilters>({
    nome: "",
    cargo: "",
    status: "",
  });
  const [filtering, setFiltering] = useState<boolean>(false);
  const [filterActive, setFilterActive] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);
  const [editedEmployee, setEditedEmployee] = useState<CreateUserData | null>(null);
  const [loadingUpdate, setLoadingUpdate] = useState<"put" | "patch" | null>(null);
  const [loadingDelete, setLoadingDelete] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<Feedback | null>(null);
  const listRequestVersion = useRef(0);
  const [employee, setEmployee] = useState<CreateUserData>({
    nome: "",
    email: "",
    telefone:"",
    cargo: "",
    departamento: "",
    salario: 0,
    cidade: "",
    status: "Ativo",
  })

  const listOperationBusy =
    loadingList || filtering || loadingPost || loadingUpdate !== null || loadingDelete;

  function hadlerChange(e: React.ChangeEvent<HTMLInputElement>){
    const { name, value } = e.target;

    setEmployee({
      ...employee,
      [name]: name === "salario" ? Number(value) : value,
    })
  }

  function handleEditedChange(e: React.ChangeEvent<HTMLInputElement>){
    const { name, value } = e.target;

    setEditedEmployee((current) => current ? {
      ...current,
      [name]: name === "salario" ? Number(value) : value,
    } : current)
  }

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement>){
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    })
  }

  async function handlerSearchUser(){
    if(loadingGet || loadingDelete || loadingUpdate !== null){
      return;
    }

    if(!idUser){
      alert('por favor coloque um id');
      return;
    }

    setLoadingGet(true);
    setSearched(true);
    setSearchError(null);
    setActionFeedback(null);

    const result = await getUserById(Number(idUser));

    if(result.status === "success"){
      setCurrentUser(result.user);
      setEditedEmployee(userToFormData(result.user));
    } else {
      setCurrentUser(null);
      setEditedEmployee(null);
      setSearchError(result.status === "not-found" ? "not-found" : "request");
    }

    setLoadingGet(false);
  }

  async function hadlerPostUser(){
      if(listOperationBusy){
        return;
      }

      if(!employee.nome.trim() || !employee.email.trim() || !employee.cargo.trim()){
        alert('por favor coloque as informções obrigatórias do funcionário (Nome, Email e cargo)')
        return;
      }

      setLoadingPost(true);
      setPosted(null);

      const dados = await postUser(employee);

      setLoadingPost(false);

      if(!dados){
        setPosted("error")
      } else {
        setPosted("success"); // Salva que deu certo no estado

        await loadAllUsers();
      
        // Opcional: Limpa o formulário após o sucesso
        setEmployee({
          nome: "",
          email: "",
          telefone: "",
          cargo: "",
          departamento: "",
          salario: 0,
          cidade: "",
          status: "Ativo",
        });
      }
  }

  async function handlerFilterUsers(){
    if(listOperationBusy){
      return;
    }

    const activeFilterCount = Object.values(filters).filter((value) => value.trim() !== "").length;

    if(activeFilterCount > 1){
      setListError("Use apenas um filtro por vez: nome, cargo ou status.");
      setFilterActive(true);
      return;
    }

    setFiltering(true);
    setLoadingList(true);
    setListError(null);

    const dados = await searchUsers(filters);
    const hasActiveFilter = Object.values(filters).some((value) => value.trim() !== "");

    if(dados){
      setAllUser(dados);
      setFilterActive(hasActiveFilter);
    } else {
      setAllUser([]);
      setListError("Não foi possível filtrar os funcionários.");
    }

    setFiltering(false);
    setLoadingList(false);
  }

  async function handlerClearFilters(){
    if(listOperationBusy){
      return;
    }

    setFilters({ nome: "", cargo: "", status: "" });
    await loadAllUsers();
  }

  async function handlerPutUser(){
    if(!currentUser || !editedEmployee || loadingGet || listOperationBusy){
      return;
    }

    if(!editedEmployee.nome.trim() || !editedEmployee.email.trim() || !editedEmployee.cargo.trim()){
      alert('Nome, e-mail e cargo são obrigatórios para a atualização completa.');
      return;
    }

    setLoadingUpdate("put");
    setActionFeedback(null);

    const atualizado = await putUser(currentUser.id, editedEmployee);

    if(atualizado){
      setCurrentUser(atualizado);
      setEditedEmployee(userToFormData(atualizado));
      setActionFeedback({ type: "success", message: "Funcionário atualizado por completo." });
      await loadAllUsers();
    } else {
      setActionFeedback({ type: "error", message: "Não foi possível atualizar o funcionário." });
    }

    setLoadingUpdate(null);
  }

  async function handlerPatchUser(){
    if(!currentUser || !editedEmployee || loadingGet || listOperationBusy){
      return;
    }

    if(!editedEmployee.nome.trim() || !editedEmployee.email.trim() || !editedEmployee.cargo.trim()){
      setActionFeedback({ type: "error", message: "Nome, e-mail e cargo não podem ficar vazios." });
      return;
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedEmployee.email.trim())){
      setActionFeedback({ type: "error", message: "Digite um e-mail válido antes de salvar." });
      return;
    }

    if(!Number.isFinite(editedEmployee.salario) || editedEmployee.salario < 0){
      setActionFeedback({ type: "error", message: "O salário precisa ser um número maior ou igual a zero." });
      return;
    }

    const changes: PartialUserData = {};

    (Object.keys(editedEmployee) as Array<keyof CreateUserData>).forEach((key) => {
      if(editedEmployee[key] !== currentUser[key]){
        Object.assign(changes, { [key]: editedEmployee[key] });
      }
    });

    if(Object.keys(changes).length === 0){
      setActionFeedback({ type: "error", message: "Nenhuma alteração foi feita." });
      return;
    }

    setLoadingUpdate("patch");
    setActionFeedback(null);

    const atualizado = await patchUser(currentUser.id, changes);

    if(atualizado){
      setCurrentUser(atualizado);
      setEditedEmployee(userToFormData(atualizado));
      setActionFeedback({ type: "success", message: "Alterações parciais salvas." });
      await loadAllUsers();
    } else {
      setActionFeedback({ type: "error", message: "Não foi possível salvar as alterações." });
    }

    setLoadingUpdate(null);
  }

  async function handlerDeleteUser(){
    if(!currentUser || loadingGet || listOperationBusy){
      return;
    }

    const confirmed = window.confirm(`Excluir o funcionário ${currentUser.nome}?`);
    if(!confirmed){
      return;
    }

    setLoadingDelete(true);
    setActionFeedback(null);

    const deletedName = currentUser.nome;
    const deleted = await deleteUser(currentUser.id);

    if(deleted){
      setCurrentUser(null);
      setEditedEmployee(null);
      setSearched(false);
      setSearchError(null);
      setUserId("");
      setActionFeedback({ type: "success", message: `${deletedName} foi excluído com sucesso.` });
      await loadAllUsers();
    } else {
      setActionFeedback({ type: "error", message: "Não foi possível excluir o funcionário." });
    }

    setLoadingDelete(false);
  }

  async function loadAllUsers(){
    const requestVersion = ++listRequestVersion.current;

    try{
      setLoadingList(true);
      setListError(null);
      const response = await api.get<User[]>('/funcionarios');

      if(requestVersion !== listRequestVersion.current){
        return;
      }

      setAllUser(response.data);
      setFilterActive(false);
    } catch(error){
      if(requestVersion !== listRequestVersion.current){
        return;
      }

      console.log("erro ao buscar usuários", error);
      setAllUser([]);
      setListError("Não foi possível carregar os funcionários.");
    } finally {
      if(requestVersion === listRequestVersion.current){
        setLoadingList(false);
      }
    }
  }

  useEffect(() => {
    loadAllUsers();
  }, [])

  return (
    <>
    <h1>PicHiring</h1>
      <form
        className="searchContainer"
        onSubmit={(event) => {
          event.preventDefault();
          void handlerSearchUser();
        }}
      >
        <span className="methodBadge">GET</span>
        <h2>Procura de Funcionários</h2>
        <label htmlFor="idInput" className="searchLabel">
          Digite o id do funcionário: <span className="requiredText">(obrigatório)</span>
        </label>
        <input
          name="idInput"
          placeholder="id do funcionário"
          type="number"
          className="idInput"
          id="idInput"
          required
          value={idUser} // Vincula o valor do input ao estado
          onChange={(e) => setUserId(e.target.value)} // Atualiza o estado a cada tecla digitada
        />
        <button
          type="submit"
          disabled={loadingGet || loadingDelete || loadingUpdate !== null} 
          className="submitButton searchButton">
          {loadingGet ? "Aguarde" : "Buscar"}
        </button>
        <div className="searchFeedback" role="status" aria-live="polite">
          {loadingGet && <p className="loadingMessage">Carregando usuário pae...</p>}
          {!loadingGet && currentUser && (
            <div className="userCard">
              <h2>Funcionário Encontrado:</h2>
              <p><strong>Nome:</strong> {currentUser.nome}</p>
              <p><strong>Cargo:</strong> {currentUser.cargo}</p>
              <p><strong>E-mail:</strong> {currentUser.email}</p>
              <div className="userCardActions">
                <button
                  type="button"
                  className="deleteButton"
                  disabled={loadingGet || listOperationBusy}
                  onClick={() => void handlerDeleteUser()}
                >
                  {loadingDelete ? "Excluindo..." : "Excluir funcionário"}
                </button>
              </div>
            </div>
          )}
          {!loadingGet && !currentUser && searched && searchError === "not-found" && (
            <p className="errorMessage">Usuário não encontrado filho.</p>
          )}
          {!loadingGet && !currentUser && searched && searchError === "request" && (
            <p className="errorMessage">Não foi possível consultar o funcionário. Verifique a conexão com a API.</p>
          )}
          {actionFeedback && !currentUser && (
            <p className={actionFeedback.type === "success" ? "sucessMessage" : "errorMessage"}>
              {actionFeedback.message}
            </p>
          )}
          </div>
        </form>

          {/* POST */}

        <form
          className="postContainer"
          onSubmit={(event) => {
            event.preventDefault();
            void hadlerPostUser();
          }}
        >
          <span className="methodBadge">POST</span>
          <h2>Cadastrar novo funcionário</h2>
          <p className="requiredNote"><span aria-hidden="true">*</span> campos obrigatórios</p>

          <div className="formGroup">
            <label htmlFor="name">Nome:<span className="requiredMark" aria-hidden="true">*</span></label>
            <input 
              type="text" 
              id="name"
              name="nome"
              required
              placeholder="Nome do funcionário"
              value={employee.nome}
              onChange={hadlerChange}
            />
          </div>
          <div className="formGroup">
            <label htmlFor="email">E-mail:<span className="requiredMark" aria-hidden="true">*</span></label>
            <input 
              type="email" 
              id="email"
              name="email" 
              required
              placeholder="email@exemplo.com"
              value={employee.email} 
              onChange={hadlerChange} 
            />
          </div>

          <div className="formGroup">
            <label htmlFor="telefone">Telefone:</label>
            <input 
              type="text" 
              id="telefone"
              name="telefone" 
              placeholder="(00) 00000-0000"
              value={employee.telefone} 
              onChange={hadlerChange} 
            />
          </div>

          <div className="formGroup">
            <label htmlFor="cargo">Cargo:<span className="requiredMark" aria-hidden="true">*</span></label>
            <input 
              type="text" 
              id="cargo"
              name="cargo" 
              required
              placeholder="Ex: Desenvolvedor"
              value={employee.cargo} 
              onChange={hadlerChange} 
            />
          </div>

          <div className="formGroup">
            <label htmlFor="departamento">Departamento:</label>
            <input 
              type="text" 
              id="departamento"
              name="departamento" 
              placeholder="Ex: Tecnologia"
              value={employee.departamento} 
              onChange={hadlerChange} 
            />
          </div>

          <div className="formGroup">
            <label htmlFor="salario">Salário (R$):</label>
            <input 
              type="number" 
              id="salario"
              name="salario" 
              min="0"
              step="0.01"
              placeholder="0.00"
              value={employee.salario || ''} 
              onChange={hadlerChange} 
            />
          </div>

          <div className="formGroup cityField">
            <label htmlFor="cidade">Cidade:</label>
            <input 
              type="text" 
              id="cidade"
              name="cidade" 
              placeholder="Ex: São Paulo"
              value={employee.cidade} 
              onChange={hadlerChange} 
            />
          </div>

          <button
          type="submit"
          disabled={listOperationBusy}
          className="submitButton">
            {loadingPost ? "Cadastrando..." : "Cadastrar Funcionário"}
          </button>
          <div className="feedBackContainer" role="status" aria-live="polite">
            {posted === "success" && (
              <p className="sucessMessage">Funcionário cadastrado com sucesso!</p>
            )}
            {posted === "error" && (
              <p className="errorMessage">Erro ao cadastrar funcionário filho.</p>
            )}
          </div>
        </form>

        {currentUser && editedEmployee && (
          <section className="managementContainer" aria-labelledby="management-title">
            <span className="methodBadge">PUT / PATCH</span>
            <h2 id="management-title">Editar funcionário #{currentUser.id}</h2>
            <p className="managementDescription">
              Altere os campos e escolha atualização completa ou somente os campos modificados.
            </p>

            <form
              className="editForm"
              onSubmit={(event) => {
                event.preventDefault();
                void handlerPutUser();
              }}
            >
              <p className="editRequiredNote"><span aria-hidden="true">*</span> campos obrigatórios</p>
              <div className="formGroup">
                <label htmlFor="edit-nome">Nome:<span className="requiredMark" aria-hidden="true">*</span></label>
                <input id="edit-nome" name="nome" required value={editedEmployee.nome} onChange={handleEditedChange} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-email">E-mail:<span className="requiredMark" aria-hidden="true">*</span></label>
                <input id="edit-email" name="email" type="email" required value={editedEmployee.email} onChange={handleEditedChange} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-telefone">Telefone:</label>
                <input id="edit-telefone" name="telefone" value={editedEmployee.telefone} onChange={handleEditedChange} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-cargo">Cargo:<span className="requiredMark" aria-hidden="true">*</span></label>
                <input id="edit-cargo" name="cargo" required value={editedEmployee.cargo} onChange={handleEditedChange} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-departamento">Departamento:</label>
                <input id="edit-departamento" name="departamento" value={editedEmployee.departamento} onChange={handleEditedChange} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-salario">Salário (R$):</label>
                <input
                  id="edit-salario"
                  name="salario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedEmployee.salario || ''}
                  onChange={handleEditedChange}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-cidade">Cidade:</label>
                <input id="edit-cidade" name="cidade" value={editedEmployee.cidade} onChange={handleEditedChange} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-status">Status:</label>
                <input id="edit-status" name="status" value={editedEmployee.status} onChange={handleEditedChange} />
              </div>

              <div className="managementActions">
                <button
                  type="submit"
                  className="submitButton"
                  disabled={loadingGet || listOperationBusy}
                >
                  {loadingUpdate === "put" ? "Salvando..." : "Salvar tudo (PUT)"}
                </button>
                <button
                  type="button"
                  className="secondaryButton"
                  disabled={loadingGet || listOperationBusy}
                  onClick={() => void handlerPatchUser()}
                >
                  {loadingUpdate === "patch" ? "Salvando..." : "Salvar alterações (PATCH)"}
                </button>
              </div>

              <div className="managementFeedback" role="status" aria-live="polite">
                {actionFeedback && (
                  <p className={actionFeedback.type === "success" ? "sucessMessage" : "errorMessage"}>
                    {actionFeedback.message}
                  </p>
                )}
              </div>
            </form>
          </section>
        )}

        {/* GETALL */}

        <div
          className="listContainer"
          role="region"
          aria-label="Funcionários cadastrados"
          tabIndex={0}
        >
          <span className="methodBadge">GET ALL</span>
          <h2>Funcionários Cadastrados</h2>

          <form
            className="filterForm"
            onSubmit={(event) => {
              event.preventDefault();
              void handlerFilterUsers();
            }}
          >
            <p className="filterHint">Use um filtro por vez: nome, cargo ou status.</p>
            <div className="formGroup">
              <label htmlFor="filter-nome">Filtrar por nome:</label>
              <input id="filter-nome" name="nome" value={filters.nome} onChange={handleFilterChange} />
            </div>
            <div className="formGroup">
              <label htmlFor="filter-cargo">Filtrar por cargo:</label>
              <input id="filter-cargo" name="cargo" value={filters.cargo} onChange={handleFilterChange} />
            </div>
            <div className="formGroup">
              <label htmlFor="filter-status">Filtrar por status:</label>
              <input id="filter-status" name="status" value={filters.status} onChange={handleFilterChange} />
            </div>
            <div className="filterActions">
              <button type="submit" className="submitButton" disabled={listOperationBusy}>
                {filtering ? "Filtrando..." : "Filtrar"}
              </button>
              <button
                type="button"
                className="secondaryButton"
                disabled={listOperationBusy}
                onClick={() => void handlerClearFilters()}
              >
                Limpar filtros
              </button>
            </div>
          </form>

          <div
            className={`listStatus${!loadingList && !listError && allUsers.length > 0 ? " listStatusComplete" : ""}`}
            role="status"
            aria-live="polite"
          >
            {loadingList && <p className="loadingMessage">Carregando Funcionários pae...</p>}

            {!loadingList && listError && (
              <p className="errorMessage">{listError}</p>
            )}
            
            {!loadingList && !listError && allUsers.length === 0 && (
              <p className="errorMessage">
                {filterActive ? "Nenhum funcionário corresponde aos filtros." : "Nenhum funcionário encontrado no sistema."}
              </p>
            )}

            {!loadingList && !listError && allUsers.length > 0 && (
              <p>
                {allUsers.length} {allUsers.length === 1 ? "funcionário carregado" : "funcionários carregados"}.
              </p>
            )}
          </div>

          {!loadingList && !listError && allUsers.length > 0 && (
            <table className="usersTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Cargo</th>
                  <th>E-mail</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* O .map percorre o array e joga cada um na tela */}
                {allUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.nome}</td>
                    <td>{user.cargo}</td>
                    <td>{user.email}</td>
                    <td>{user.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
    </>
  );
}

export default App;
